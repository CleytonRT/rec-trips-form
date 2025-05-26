document.addEventListener('DOMContentLoaded', () => {
  /* — Helpers — */
  const btn = id => document.getElementById(id);
  const stepsIds = ['step0','step1','step2','step3','step4'];
  const steps    = stepsIds.map(id => document.getElementById(id));
  const mainHdr  = document.getElementById('mainHeader');
  const hdrTitle = document.getElementById('headerTitle');
  const progLis  = mainHdr.querySelectorAll('.progress-bar li');
  let chosenLabel = '';

  function showStep(i) {
    steps.forEach((s,j) => s.classList.toggle('hidden', j !== i));
    if (i > 0 && i < 4) {
      mainHdr.classList.remove('hidden');
      hdrTitle.textContent = chosenLabel;
      progLis.forEach((li,j) => li.classList.toggle('active', j === i-1));
    } else {
      mainHdr.classList.add('hidden');
    }
  }

  /* — Step 0: escolha de destino — */
  document.querySelectorAll('input[name="destination"]').forEach(r => {
    r.onchange = e => {
      chosenLabel = e.target.closest('label').textContent.trim();
      btn('toStep1').disabled = false;
    };
  });
  btn('toStep1').onclick = () => showStep(1);

  /* — Step 1: dados pessoais — */
  function validateStep1() {
    let ok = true;
    ['fullName','whatsapp','birthDate','rg','cpf'].forEach(id => {
      const f = document.getElementById(id);
      f.classList.remove('invalid');
      f.parentNode.querySelectorAll('.error-text').forEach(x => x.remove());
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
  // **Aqui** movemos a função de toggle de quartos para o Step2
  const roomSec = document.getElementById('roomOptions');
  btn('toStep2').onclick = () => {
    if (!validateStep1()) return;

    // exibe ou oculta #roomOptions dependendo de “Hospedagem”
    if (chosenLabel.includes('Hospedagem')) {
      roomSec.classList.remove('hidden');
    } else {
      roomSec.classList.add('hidden');
    }

    // limpa erros antigos de room/acompan
    roomSec.querySelectorAll('.error-text').forEach(x => x.remove());
    document.getElementById('companionsBlock')
      .querySelectorAll('.error-text').forEach(x => x.remove());

    showStep(2);
  };
  btn('backToStep0').onclick = () => showStep(0);

  /* — Step 2: quartos & acompanhantes — */
  btn('toStep3').onclick = () => {
    let ok = true;

    // validação de quarto (só se Hospedagem)
    if (chosenLabel.includes('Hospedagem') &&
        !roomSec.querySelector('input[name="roomType"]:checked')) {
      ok = false;
      const msg = document.createElement('small');
      msg.className = 'error-text';
      msg.textContent = 'Selecione o tipo de quarto';
      roomSec.appendChild(msg);
    }

    // validação de acompanhantes ou solo
    const solo = btn('soloTravel').checked;
    const list = document.getElementById('companionsList');
    
    if (!solo && list.children.length === 0) {
      ok = false;
      const msg = document.createElement('small');
      msg.className = 'error-text';
      msg.textContent = 'Adicione passageiro ou marque viajando sozinho';
      document.getElementById('companionsBlock').appendChild(msg);
    }

    if (ok) showStep(3);
  };
  btn('backToStep1').onclick = () => showStep(1);

  // --- adicionar e remoção de passageiros ---
  btn('addCompanion').onclick = () => {
  const inp = document.getElementById('companionName');
  const name = inp.value.trim();
  if (!name) return;

  // cria item da lista
  const li = document.createElement('li');
  li.textContent = name;

  // botão de remover
  const rm = document.createElement('button');
  rm.type = 'button';
  rm.className = 'btn-remove';
  rm.textContent = 'Remover';
  rm.onclick = () => li.remove();

  // anexa ao li e limpa input
  li.append(' ', rm);
  document.getElementById('companionsList').appendChild(li);
  inp.value = '';
};

  /* — Step 3: termos & assinatura — */
  const accept = btn('acceptTerms');
  const canvas = document.getElementById('signaturePad');
  const clear  = btn('clearSignature');
  const errSig = document.getElementById('error-signature');
  const ctx    = canvas.getContext('2d');
  let drawing  = false;

  canvas.onpointerdown = () => drawing = true;
  canvas.onpointerup   = () => { drawing = false; ctx.beginPath(); };
  canvas.onpointermove = e => {
    if (!drawing) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  clear.onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    errSig.style.display = 'none';
  };

  function validateStep3() {
    document.querySelector('.terms-accept .error-text')?.remove();
    let ok = true;
    if (!accept.checked) {
      ok = false;
      const msg = document.createElement('small');
      msg.className = 'error-text';
      msg.textContent = 'Você deve aceitar os termos';
      document.querySelector('.terms-accept').appendChild(msg);
    }
    const blank = ctx.getImageData(0,0,canvas.width,canvas.height)
                     .data.every(v => v === 0);
    if (blank) {
      ok = false;
      errSig.style.display = 'block';
    }
    return ok;
  }

  btn('toSubmit').onclick = () => {
    if (validateStep3()) showStep(4);
  };
  btn('backToStep2').onclick = () => showStep(2);

  /* — Step 4: mensagem de sucesso já está em seu HTML — */
  /* — Inicializa no Step 0 — */
  showStep(0);

  /* — Máscaras (CPF e WhatsApp) — */
  document.getElementById('cpf').addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g,'').slice(0,11);
    v = v.replace(/(\d{3})(\d)/,'$1.$2')
         .replace(/(\d{3})(\d)/,'$1.$2')
         .replace(/(\d{3})(\d{1,2})$/,'$1-$2');
    e.target.value = v;
  });

  const wt = document.getElementById('whatsapp');
  wt.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g,'').slice(0,11);
    e.target.value = v.length<3
      ? '('+v
      : '('+v.slice(0,2)+')'+v.slice(2);
    wt.setCustomValidity('');
  });
  wt.addEventListener('blur', e => {
    const L = e.target.value.replace(/\D/g,'').length;
    wt.setCustomValidity((L<10||L>11)?'Digite 10–11 dígitos':'');
  });
});
