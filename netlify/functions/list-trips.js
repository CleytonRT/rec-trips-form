import { withSupabase } from '@supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: corsHeaders
});

const normalizeText = (value = '') => String(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const parseDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateBr = (value) => {
  if (!value) return '';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
};

const normalizeEmbark = (item) => {
  if (!item) return null;
  if (typeof item === 'object') {
    return {
      nome: item.nome || item.name || item.local || item.location || '',
      cidade: item.cidade || item.city || ''
    };
  }

  const clean = String(item).replace(/\s+-\s+\d{1,2}:\d{2}.*$/, '').trim();
  const [name = '', ...cityParts] = clean.split(',');
  return {
    nome: name.trim(),
    cidade: cityParts.join(',').trim()
  };
};

const isOpenForRegistration = (trip) => {
  if (trip.deleted_at) return false;
  if (['finalizada', 'finalizado', 'finalized', 'arquivada', 'archived', 'cancelada', 'cancelled'].includes(normalizeText(trip.status))) {
    return false;
  }

  if (normalizeText(trip.status) !== 'cadastro aberto') return false;

  const lifecycle = trip.details?.lifecycle || trip.card?.lifecycle || {};
  const registrationEnabled = lifecycle.registrationEnabled || trip.details?.registrationEnabled || trip.card?.registrationEnabled;
  if (!registrationEnabled) return false;

  const closesAt = parseDateTime(lifecycle.registrationClosesAt || trip.details?.registrationClosesAt || trip.card?.registrationClosesAt);
  return !closesAt || closesAt > new Date();
};

const normalizeTrip = (trip) => {
  const card = trip.card || {};
  const details = trip.details || {};
  const slug = trip.slug || trip.id;
  const type = trip.type || card.tipo || details.type || '';

  return {
    id: trip.id,
    slug,
    titulo: trip.title || card.titulo || details.title || slug,
    subtitulo: card.subtitulo || details.subtitle || '',
    tipo: normalizeText(type).includes('hospedagem') ? 'hospedagem' : 'bateVolta',
    tipoLabel: type,
    data: trip.trip_date,
    ida: trip.trip_date,
    volta: trip.return_date || trip.trip_date,
    retornoData: trip.return_date || trip.trip_date,
    valor: trip.price_label || card.valor || details.price_full || '',
    vagasTotal: Number(trip.capacity || 0),
    status: trip.status || 'Cadastro aberto',
    imagem: trip.card_image_url || card.imagem || details.hero || '',
    formDestination: trip.form_title || details.formDestination || '',
    dataLabel: formatDateBr(trip.trip_date),
    quartos: (details.quartos || details.rooms || []).map((room) => ({
      id: room.id || room.slug || '',
      titulo: room.titulo || room.title || '',
      valor: room.valor || room.price || '',
      descricao: room.descricao || room.description || ''
    })),
    embarques: (details.embarques || details.boarding || details.embarkOptions || card.embarques || [])
      .map(normalizeEmbark)
      .filter((item) => item && item.nome)
  };
};

const handler = withSupabase({ auth: 'none' }, async (request, ctx) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'GET') return json({ ok: false, error: 'Metodo nao permitido.' }, 405);

  try {
    const { data, error } = await ctx.supabaseAdmin
      .from('trips')
      .select('*')
      .is('deleted_at', null)
      .order('trip_date', { ascending: true });

    if (error) throw error;

    return json({
      ok: true,
      viagens: (data || []).filter(isOpenForRegistration).map(normalizeTrip)
    });
  } catch (error) {
    console.error('[list-trips]', error);
    return json({ ok: false, error: error.message || 'Erro ao carregar viagens.' }, 500);
  }
});

export default handler;
