// script.js
// Multi-step form with validation, masks, Netlify Forms ➔ Google Sheets (no‑cors)

document.addEventListener('DOMContentLoaded', () => {
  // === Config ===
  const scriptURL = 'https://script.google.com/macros/s/AKfycbwndK4APkx0AWs3SQRKeOrnabfgAZQ7c2kxSahoph4-da4t4yUftIywFaA3YEz6SwAB/exec';
  const btn = id => document.getElementById(id);
  const steps = ['step0','step1','step2','step3','step4'].map(id => btn(id));
  const header = document.getElementById('mainHeader');
  const title  = document.getElementById('headerTitle');
  const progLis = Array.from(document.querySelectorAll('.progress-bar li'));

  let chosenLabel = '';

  // === Navigation ===
  function showStep(i) {
    steps.forEach((sec, idx) => sec.classList.toggle('hidden', idx !== i));
    if (i > 0 && i < 4) {
      header.classList.remove('hidden');
      title.textContent = chosenLabel;
      progLis.forEach((li, idx) => li.classList.toggle('active', idx === i-1));
    } else {
      header.classList.add('hidden');
    }
  }

  btn('toStep1').onclick    = () => showStep(1);
  btn('backToStep0').onclick = () => showStep(0);

  // Step0: escolha de destino
  document.querySelectorAll('input[name="destination"]').forEach(radio => {
    radio.addEventListener('change', e => {
      chosenLabel = e.target.closest('label').textContent.trim();
      btn('toStep1').disabled = false;
    });
  });

  // === Step1: Dados Pessoais ===
  function validateStep1() {
    let ok = true;
    ['fullName','whatsapp','birthDate','rg','cpf'].forEach(id => {
      const f = btn(id);
      f.classList.remove('invalid');
      f.parentNode.querySelectorAll('.error-text').forEach(e => e.remove());
      const val = f.value.trim();
      let msg = '';
      if (!val) msg = 'Preencha este campo';
      else if (id === 'cpf' && val.replace(/\D/g,'').length < 11)
        msg = 'CPF deve ter 11 dígitos';
      else if (id === 'whatsapp') {
        const len = val.replace(/\D/g,'').length;
        if (len < 10 || len > 11) msg = 'Informe 10–11 dígitos';
      }
      if (msg) {
        ok = false;
        f.classList.add('invalid');
        const e = document.createElement('small');
        e.className = 'error-text';
        e.textContent = msg;
        f.parentNode.appendChild(e);
      }
    });
    return ok;
  }
  btn('toStep2').onclick     = () => { if (validateStep1()) initStep2(); };
  btn('backToStep1').onclick = () => showStep(1);

  // Step2 setup & validation
  let roomSec, companionsBlock, companionInput, companionsList, soloChk, next2Btn;
  function initStep2() {
    // show/hide quartos
    roomSec = btn('roomOptions');
    if (chosenLabel.includes('Hospedagem')) roomSec.classList.remove('hidden');
    else roomSec.classList.add('hidden');
    // reset errors
    roomSec.querySelectorAll('.error-text').forEach(e => e.remove());
    companionsBlock = btn('companionsBlock');
    companionsBlock.querySelectorAll('.error-text').forEach(e => e.remove());
    // setup companions
    companionInput = btn('companionName');
    companionsList = btn('companionsList');
    soloChk        = btn('soloTravel');
    next2Btn       = btn('toStep3');
    next2Btn.disabled = true;

    // add companion
    // add companion with remove & mutual exclusion
btn('addCompanion').onclick = () => {
  const name = companionInput.value.trim();
  if (!name) return;
  // remove previous error if any
  companionsBlock.querySelector('.error-text')?.remove();
  // create list item
  const li = document.createElement('li');
  li.textContent = name;
  const rm = document.createElement('button');
  rm.type = 'button'; rm.className = 'btn-remove'; rm.textContent = 'Remover';
  rm.onclick = () => {
    li.remove();
    // re-enable solo checkbox if no companions left
    if (companionsList.children.length === 0) soloChk.disabled = false;
    // re-validate next button
    next2Btn.disabled = !(soloChk.checked || companionsList.children.length > 0);
  };
  li.append(' ', rm);
  companionsList.appendChild(li);
  companionInput.value = '';
  // when a companion is added, disable solo travel
  soloChk.checked = false;
  soloChk.disabled = true;
  // enable next button
  next2Btn.disabled = false;
};

    // solo travel checkbox change with mutual exclusion
soloChk.onchange = () => {
  companionsBlock.querySelector('.error-text')?.remove();
  if (soloChk.checked) {
    // clear companions list
    companionsList.innerHTML = '';
    companionInput.value = '';
    // disable add companion button
    btn('addCompanion').disabled = true;
  } else {
    btn('addCompanion').disabled = false;
  }
  // enable next only if solo or companions exist
  next2Btn.disabled = !(soloChk.checked || companionsList.children.length > 0);
};
    // next
    next2Btn.onclick = () => {
      // clear old
      roomSec.querySelector('.error-text')?.remove();
      companionsBlock.querySelector('.error-text')?.remove();
      let ok = true;
      if (chosenLabel.includes('Hospedagem') && !roomSec.querySelector('input[name="roomType"]:checked')) {
        ok = false;
        const e = document.createElement('small');
        e.className = 'error-text';
        e.textContent = 'Selecione o tipo de quarto';
        roomSec.appendChild(e);
      }
      if (!soloChk.checked && companionsList.children.length===0) {
        ok = false;
        const e = document.createElement('small');
        e.className = 'error-text';
        e.textContent = 'Adicione passageiro ou marque sozinho';
        companionsBlock.appendChild(e);
      }
      if (ok) showStep(3);
    };
    showStep(2);
  }

  // === Step3: Termos & Assinatura ===
  const accept = btn('acceptTerms');
  const canvas = btn('signaturePad');
  const clear  = btn('clearSignature');
  const errSig = btn('error-signature');
  const ctx    = canvas.getContext('2d');
  let drawing  = false;

  canvas.onpointerdown = () => drawing = true;
  canvas.onpointerup   = () => { drawing=false; ctx.beginPath(); };
  canvas.onpointermove = e => {
    if (!drawing) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    ctx.lineWidth = 2; ctx.lineCap='round'; ctx.strokeStyle='#000';
    ctx.lineTo(x,y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x,y);
  };
  clear.onclick = () => { ctx.clearRect(0,0,canvas.width,canvas.height); errSig.style.display='none'; };

  function validateStep3() {
    document.querySelector('.terms-accept .error-text')?.remove();
    let ok = true;
    if (!accept.checked) {
      ok = false;
      const e = document.createElement('small'); e.className='error-text';
      e.textContent='Você deve aceitar os termos'; document.querySelector('.terms-accept').appendChild(e);
    }
    const blank = ctx.getImageData(0,0,canvas.width,canvas.height).data.every(v=>v===0);
    if (blank) { ok=false; errSig.style.display='block'; }
    return ok;
  }
  btn('backToStep2').onclick = () => showStep(2);
  btn('toSubmit').onclick = () => {
    if (!validateStep3()) return;
    const formEl = document.getElementById('registrationForm');
    const data   = new FormData(formEl);
    // --- monta a string de acompanhantes ---
    const companionsArr = Array.from(companionsList.children)
    .map(li => li.firstChild.textContent.trim());
    const signatureDataURL = canvas.toDataURL('image/png');
    data.set('signature', signatureDataURL);
    data.set('companions', companionsArr.join('; '));
    data.set('destination', chosenLabel);
    fetch(scriptURL, { method:'POST', mode:'no-cors', body: data })
      .catch(_=>{});
    showStep(4);
  };

  // === Masks ===
  btn('cpf').addEventListener('input', e => {
    let v=e.target.value.replace(/\D/g,'').slice(0,11);
    v=v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
    e.target.value=v;
  });
  const wt=btn('whatsapp');
  wt.addEventListener('input', e => {
    let v=e.target.value.replace(/\D/g,'').slice(0,11);
    e.target.value = v.length<3 ? '('+v : '('+v.slice(0,2)+')'+v.slice(2);
    wt.setCustomValidity('');
  });
  wt.addEventListener('blur', e => {
    const l=e.target.value.replace(/\D/g,'').length;
    wt.setCustomValidity((l<10||l>11)?'Digite 10–11 dígitos':'');
  });

  // === Init ===
  showStep(0);
});
