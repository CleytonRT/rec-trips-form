document.addEventListener('DOMContentLoaded', () => {
  /* ==== Masks: CPF and WhatsApp ==== */
  const cpfInput = document.getElementById('cpf');
  cpfInput.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    v = v
      .replace(/(\d{3})(\d)/, '$1.$2')
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

  /* ==== Multi-Step Navigation ==== */
const steps = ['step0','step1','step2','step3','step4']
  .map(id => document.getElementById(id));
  const mainHeader  = document.getElementById('mainHeader');
  const headerTitle = document.getElementById('headerTitle');
  const progressLis = mainHeader.querySelectorAll('.progress-bar li');
  let chosenLabel   = '';

  function showStep(index) {
    steps.forEach((sec, i) => sec.classList.toggle('hidden', i !== index));
    mainHeader.classList.toggle('hidden', index === 0);
    if (index > 0) headerTitle.textContent = chosenLabel;
    progressLis.forEach((li, i) => li.classList.toggle('active', i === index-1));
  }

  /* Step 0: Choose destination */
  document.querySelectorAll('input[name="destination"]').forEach(radio => {
    radio.addEventListener('change', e => {
      chosenLabel = e.target.closest('label').textContent.trim();
      btn('toStep1').disabled = false;
    });
  });
  btn('toStep1').onclick    = () => showStep(1);
  btn('backToStep0').onclick = () => showStep(0);

  /* Step 1: Personal Data Validation */
  function validateStep1() {
    const ids = ['fullName','whatsapp','birthDate','rg','cpf'];
    let valid = true;
    ids.forEach(id => {
      const f = document.getElementById(id);
      f.classList.remove('invalid');
      const old = f.parentNode.querySelector('.error-text');
      if (old) old.remove();
      if (!f.value.trim()) {
        valid = false;
        f.classList.add('invalid');
        const msg = document.createElement('small');
        msg.className = 'error-text';
        msg.textContent = 'Preencha este campo';
        f.parentNode.appendChild(msg);
      }
    });
    return valid;
  }
  btn('toStep2').onclick     = () => validateStep1() && showStep(2);
  btn('backToStep1').onclick = () => showStep(1);

  /* Step 2: Room options & Companions */
  const roomSection = document.getElementById('roomOptions');
  btn('toStep2').addEventListener('click', () => {
    roomSection.classList.toggle('hidden', !chosenLabel.includes('(Hospedagem)'));
  });

  document.getElementById('addCompanion').onclick = () => {
    const inp = document.getElementById('companionName');
    if (!inp.value.trim()) return;
    const li = document.createElement('li');
    li.textContent = inp.value.trim();
    document.getElementById('companionsList').appendChild(li);
    inp.value = '';
  };

  function validateStep2() {
    let valid = true;
    // room validation
    if (chosenLabel.includes('(Hospedagem)')) {
      const sel = roomSection.querySelector('input[name="roomType"]:checked');
      const prev = roomSection.querySelector('.error-text');
      if (prev) prev.remove();
      if (!sel) {
        valid = false;
        const msg = document.createElement('small');
        msg.className = 'error-text';
        msg.textContent = 'Selecione tipo de quarto';
        roomSection.appendChild(msg);
      }
    }
    // companions or solo
    const solo = document.getElementById('soloTravel').checked;
    const list = document.getElementById('companionsList');
    const cont = list.parentNode;
    const prev = cont.querySelector('.error-text');
    if (prev) prev.remove();
    if (!solo && list.children.length === 0) {
      valid = false;
      const msg = document.createElement('small');
      msg.className = 'error-text';
      msg.textContent = 'Adicione passageiro ou marque viajando sozinho';
      cont.appendChild(msg);
    }
    return valid;
  }
  btn('toStep3').onclick     = () => validateStep2() && showStep(3);
  btn('backToStep2').onclick = () => showStep(2);

  /* Initialize to first step */
  showStep(0);

  /* ==== Step 3: Netlify Submit, Terms & Signature ==== */
  const form          = document.getElementById('registrationForm');
  const acceptTerms   = document.getElementById('acceptTerms');
  const signaturePad  = document.getElementById('signaturePad');
  const clearCanvas   = document.getElementById('clearSignature');
  const errorSign     = document.getElementById('error-signature');
  const ctx = signaturePad.getContext('2d');
  let drawing = false;

  // Canvas drawing
  signaturePad.addEventListener('pointerdown', () => drawing = true);
  signaturePad.addEventListener('pointerup',   () => { drawing = false; ctx.beginPath(); });
  signaturePad.addEventListener('pointermove', e => {
    if (!drawing) return;
    const { left, top } = signaturePad.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  });
  // Clear canvas
  clearCanvas.onclick = () => {
    ctx.clearRect(0, 0, signaturePad.width, signaturePad.height);
    errorSign.style.display = 'none';
  };

btn('toSubmit').addEventListener('click', e => {
  // validar termos + assinatura como já faz
  if (!validateStep3()) return;  // bloqueia se inválido

  // aqui não fazemos form.submit(); apenas mostramos o passo 4
  showStep(4);
});

  let ok = true;
    // terms checkbox
    document.querySelector('.terms-accept .error-text')?.remove();
    if (!acceptTerms.checked) {
      ok = false;
      const msg = document.createElement('small');
      msg.className = 'error-text';
      msg.textContent = 'Você deve aceitar os termos';
      document.querySelector('.terms-accept').appendChild(msg);
    }
    // signature not blank
    const blank = ctx.getImageData(0,0,signaturePad.width,signaturePad.height)
                   .data.every(v => v === 0);
    if (blank) {
      ok = false;
      errorSign.style.display = 'block';
    }
    if (!ok) e.preventDefault();  // block native submit if invalid
  });

  /* Helper to grab buttons by id */
  function btn(id) { return document.getElementById(id); }
});
