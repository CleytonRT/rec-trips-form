document.addEventListener('DOMContentLoaded', () => {
  // --- Masks: CPF and WhatsApp ---
  const cpfInput = document.getElementById('cpf');
  cpfInput.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    e.target.value = v;
  });

  const whatsapp = document.getElementById('whatsapp');
  whatsapp.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    e.target.value = v.length < 3
      ? '(' + v
      : '(' + v.slice(0,2) + ')' + v.slice(2);
    e.target.setCustomValidity('');
  });
  whatsapp.addEventListener('blur', e => {
    const len = e.target.value.replace(/\D/g, '').length;
    e.target.setCustomValidity(
      (len < 10 || len > 11)
        ? 'Número deve ter 10–11 dígitos'
        : ''
    );
  });

  // --- Step Navigation ---
  const steps = ['step0','step1','step2','step3']
    .map(id => document.getElementById(id));
  const header = document.getElementById('mainHeader');
  const title  = document.getElementById('headerTitle');
  const prog   = header.querySelectorAll('.progress-bar li');

  function showStep(i) {
    steps.forEach((s,j) => s.classList.toggle('hidden', j !== i));
    header.classList.toggle('hidden', i === 0);
    if (i > 0) title.textContent = chosenLabel;
    prog.forEach((li,j) => li.classList.toggle('active', j === i - 1));
  }

  // --- Step 0: Destination ---
  let chosenLabel = '';
  document.querySelectorAll('input[name="destination"]').forEach(r => {
    r.addEventListener('change', e => {
      chosenLabel = e.target.closest('label').textContent.trim();
      btn('toStep1').disabled = false;
    });
  });
  btn('toStep1').onclick = () => showStep(1);
  btn('backToStep0').onclick = () => showStep(0);

  // --- Step 1: Personal Data Validation ---
  function validateStep1() {
    const fields = ['fullName','whatsapp','birthDate','rg','cpf'];
    let ok = true;
    fields.forEach(id => {
      const f = document.getElementById(id);
      f.classList.remove('invalid');
      const err = f.parentNode.querySelector('.error-text');
      if (err) err.remove();
      if (!f.value.trim()) {
        ok = false;
        f.classList.add('invalid');
        const msg = document.createElement('small');
        msg.className = 'error-text';
        msg.textContent = 'Preencha este campo';
        f.parentNode.appendChild(msg);
      }
    });
    return ok;
  }
  btn('toStep2').onclick = () => validateStep1() && showStep(2);
  btn('backToStep1').onclick = () => showStep(1);

  // --- Step 2: Room & Companion Logic ---
  const room = document.getElementById('roomOptions');
  btn('toStep2').addEventListener('click', () => {
    room.classList.toggle('hidden', !chosenLabel.includes('(Hospedagem)'));
  });

  // Add companion
  document.getElementById('addCompanion').onclick = () => {
    const inp = document.getElementById('companionName');
    if (!inp.value.trim()) return;
    const li = document.createElement('li'); li.textContent = inp.value.trim();
    document.getElementById('companionsList').appendChild(li);
    inp.value = '';
  };

  function validateStep2() {
    let ok = true;
    // room validation for hospedagem
    if (chosenLabel.includes('(Hospedagem)')) {
      const sel = room.querySelector('input[name="roomType"]:checked');
      const e = room.querySelector('.error-text'); if (e) e.remove();
      if (!sel) {
        ok = false;
        const msg = document.createElement('small');
        msg.className = 'error-text';
        msg.textContent = 'Selecione tipo de quarto';
        room.appendChild(msg);
      }
    }
    // companion or solo
    const solo = document.getElementById('soloTravel').checked;
    const list = document.getElementById('companionsList');
    const cont = list.parentNode;
    const e = cont.querySelector('.error-text'); if (e) e.remove();
    if (!solo && list.children.length === 0) {
      ok = false;
      const msg = document.createElement('small');
      msg.className = 'error-text';
      msg.textContent = 'Adicione passageiro ou marque viajando sozinho';
      cont.appendChild(msg);
    }
    return ok;
  }
  btn('toStep3').onclick = () => validateStep2() && showStep(3);
  btn('backToStep2').onclick = () => showStep(2);

  // Utility to get button by id
  function btn(id) { return document.getElementById(id); }

  // Initialize
  showStep(0);

  // --- Step 3: Termos & Assinatura ---
const acceptTerms     = document.getElementById('acceptTerms');
const signaturePadEl  = document.getElementById('signaturePad');
const clearBtn        = document.getElementById('clearSignature');
const errorSignature  = document.getElementById('error-signature');
const toSubmit        = document.getElementById('toSubmit');

// inicializa canvas para desenho
const ctx = signaturePadEl.getContext('2d');
let drawing = false;

signaturePadEl.addEventListener('pointerdown', () => { drawing = true; });
signaturePadEl.addEventListener('pointerup',   () => { drawing = false; ctx.beginPath(); });
signaturePadEl.addEventListener('pointermove', e => {
  if (!drawing) return;
  const rect = signaturePadEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#000';
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
});

// botão limpar
clearBtn.onclick = () => {
  ctx.clearRect(0, 0, signaturePadEl.width, signaturePadEl.height);
  errorSignature.style.display = 'none';
};

// validação e submit
toSubmit.onclick = () => {
  // limpa erros anteriores
  errorSignature.style.display = 'none';
  document.querySelector('.terms-accept .error-text')?.remove();

  let ok = true;
  // checa termos
  if (!acceptTerms.checked) {
    ok = false;
    const msg = document.createElement('small');
    msg.className = 'error-text';
    msg.textContent = 'Você deve aceitar os termos';
    document.querySelector('.terms-accept').appendChild(msg);
  }
  // checa assinatura (canvas não está em branco)
  const blank = ctx.getImageData(0, 0, signaturePadEl.width, signaturePadEl.height)
                .data.every(v => v === 0);
  if (blank) {
    ok = false;
    errorSignature.style.display = 'block';
  }

  if (ok) {
    // tudo certo, submete o form
    document.getElementById('registrationForm').submit();
  }
};
});