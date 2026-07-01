import { withSupabase } from '@supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: corsHeaders
});

const normalizeDigits = (value = '') => String(value).replace(/\D/g, '');

const normalizeText = (value = '') => String(value)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const slugify = (value = '') => normalizeText(value).replace(/\s+/g, '-');

const parseDate = (value = '') => {
  if (!value) return null;
  const text = String(value).trim();
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
};

const parseDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const booleanFromForm = (value) => {
  const text = normalizeText(value);
  return ['on', 'sim', 'true', '1', 'yes'].includes(text);
};

const objectFromFormData = async (request) => {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return request.json();
  }

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
};

const tripIdFromBody = (body) => {
  const tripPayload = typeof body.selectedTrip === 'string'
    ? JSON.parse(body.selectedTrip || '{}')
    : (body.selectedTrip || {});

  return body.tripId || body.destinationId || tripPayload.id || slugify(body.destination || tripPayload.titulo);
};

const tripIsOpenForRegistration = (trip) => {
  if (!trip || trip.deleted_at) return false;
  if (['finalizada', 'finalizado', 'finalized', 'arquivada', 'archived', 'cancelada', 'cancelled', 'modelo'].includes(normalizeText(trip.status))) {
    return false;
  }

  const lifecycle = trip.details?.lifecycle || trip.card?.lifecycle || {};
  const registrationEnabled = lifecycle.registrationEnabled || trip.details?.registrationEnabled || trip.card?.registrationEnabled;
  if (!registrationEnabled) return false;

  const closesAt = parseDateTime(lifecycle.registrationClosesAt || trip.details?.registrationClosesAt || trip.card?.registrationClosesAt);
  return !closesAt || closesAt > new Date();
};

const loadRegistrationTrip = async (supabaseAdmin, body) => {
  const tripId = tripIdFromBody(body);
  if (!tripId) throw new Error('Selecione uma viagem valida para concluir o cadastro.');

  const response = await supabaseAdmin
    .from('trips')
    .select('id, form_title, status, deleted_at, card, details')
    .eq('id', tripId)
    .maybeSingle();

  if (response.error) throw response.error;
  if (!tripIsOpenForRegistration(response.data)) {
    throw new Error('Essa viagem ainda nao esta aberta para cadastro.');
  }

  return response.data;
};

const upsertPassenger = async (supabaseAdmin, body) => {
  const cpf = normalizeDigits(body.cpf);
  const passenger = {
    full_name: String(body.fullName || '').trim(),
    birth_date: parseDate(body.birthDate),
    contact: String(body.whatsapp || '').trim(),
    email: body.email ? String(body.email).trim().toLowerCase() : null,
    rg: String(body.rg || '').trim(),
    cpf: cpf || null,
    document_data: {
      rg: String(body.rg || '').trim(),
      cpf: String(body.cpf || '').trim()
    },
    personal_data: {
      underage: booleanFromForm(body.underage)
    },
    raw_payload: body,
    source: 'cadastro',
    deleted_at: null
  };

  if (!passenger.full_name || !passenger.birth_date || !passenger.contact || !passenger.rg || !passenger.cpf) {
    throw new Error('Campos obrigatorios do passageiro incompletos.');
  }

  const existing = await supabaseAdmin
    .from('passengers')
    .select('id')
    .eq('cpf', passenger.cpf)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data?.id) {
    const updated = await supabaseAdmin
      .from('passengers')
      .update(passenger)
      .eq('id', existing.data.id)
      .select('id')
      .single();
    if (updated.error) throw updated.error;
    return updated.data;
  }

  const inserted = await supabaseAdmin
    .from('passengers')
    .insert(passenger)
    .select('id')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data;
};

const handler = withSupabase({ auth: 'none' }, async (request, ctx) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return json({ ok: false, error: 'Metodo nao permitido.' }, 405);

  try {
    const body = await objectFromFormData(request);
    const trip = await loadRegistrationTrip(ctx.supabaseAdmin, body);

    const passenger = await upsertPassenger(ctx.supabaseAdmin, body);

    const link = {
      trip_id: trip.id,
      passenger_id: passenger.id,
      trip_title: trip.form_title,
      embark_location: body.embarkLocation || null,
      room_type: body.roomType || null,
      companions: body.companions || null,
      solo_travel: booleanFromForm(body.soloTravel),
      underage: booleanFromForm(body.underage),
      lap_child: booleanFromForm(body.passageiroColo),
      lap_child_manual: false,
      occupies_seat: !booleanFromForm(body.passageiroColo),
      status: 'confirmado',
      source: 'cadastro',
      raw_payload: body,
      deleted_at: null
    };

    const savedLink = await ctx.supabaseAdmin
      .from('trip_passengers')
      .upsert(link, { onConflict: 'trip_id,passenger_id' })
      .select('id, lap_child, occupies_seat')
      .single();

    if (savedLink.error) throw savedLink.error;

    return json({
      ok: true,
      passengerId: passenger.id,
      tripId: trip.id,
      tripPassengerId: savedLink.data.id,
      lapChild: savedLink.data.lap_child,
      occupiesSeat: savedLink.data.occupies_seat
    });
  } catch (error) {
    console.error('[register-passenger]', error);
    return json({ ok: false, error: error.message || 'Erro ao salvar cadastro.' }, 400);
  }
});

export default handler;
