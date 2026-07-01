document.addEventListener('DOMContentLoaded', () => {
  const registerPassengerURL = '/.netlify/functions/register-passenger';
  const listTripsURL = '/.netlify/functions/list-trips';
  const $ = (id) => document.getElementById(id);

  const form = $('registrationForm');
  const steps = ['step0', 'step1', 'step2', 'step3', 'step4'].map($);
  const header = $('mainHeader');
  const title = $('headerTitle');
  const progLis = Array.from(document.querySelectorAll('.progress-bar li'));
  const companionsField = $('companionsField');
  const signatureField = $('signatureField');
  const destinationOptions = $('destinationOptions');
  const birthDateInput = $('birthDate');

  let viagens = [];
  let selectedTrip = null;
  let chosenLabel = '';
  let roomSec;
  let companionsBlock;
  let companionInput;
  let companionsList;
  let soloChk;
  let next2Btn;
  let maxReachedStep = 0;

  const fallbackTravelConfig = { viagens: [] };

  const isHospedagem = () => selectedTrip?.tipo === 'hospedagem';

  const tripLabel = (trip) => `${trip.titulo} (${trip.tipoLabel || trip.tipo})`;

  const loadStaticTravelConfig = () => fetch('json/viagens.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });

  const loadTravelConfig = () => fetch(listTripsURL, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((config) => {
      if (!Array.isArray(config.viagens)) throw new Error('Resposta sem lista de viagens.');
      return config;
    })
    .catch((error) => {
      console.warn('Usando viagens locais de emergencia:', error);
      return loadStaticTravelConfig().catch(() => fallbackTravelConfig);
    });

  const formatBirthDate = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    return parts.join('/');
  };

  const parseBirthDate = (value) => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    if (year < 1900 || date > new Date()) return null;

    return date;
  };


  const parseTripDate = (value) => {
    if (!value) return null;
    const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const br = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return null;
  };

  const addMonths = (date, months) => {
    const copy = new Date(date.getTime());
    const originalDay = copy.getDate();
    copy.setMonth(copy.getMonth() + months);
    if (copy.getDate() < originalDay) copy.setDate(0);
    return copy;
  };

  const isLapChildPassenger = () => {
    const birthDate = parseBirthDate(birthDateInput.value);
    const tripDate = parseTripDate(selectedTrip?.data || selectedTrip?.ida || selectedTrip?.date);
    if (!birthDate || !tripDate) return false;
    return birthDate <= tripDate && addMonths(birthDate, 69) >= tripDate;
  };

  const postSupabaseRegistration = async (data) => {
    const response = await fetch(registerPassengerURL, { method: 'POST', body: data });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || `Falha Supabase HTTP ${response.status}`);
    }
    return payload;
  };
  const optionCard = ({ name, value, title, subtitle }) => {
    const label = document.createElement('label');
    label.className = 'option-card compact';
    label.innerHTML = `
      <input type="radio" name="${name}" value="${value}">
      <span>
        <strong>${title}</strong>
        <small>${subtitle || ''}</small>
      </span>
    `;
    return label;
  };

  const renderDestinationOptions = () => {
    destinationOptions.innerHTML = '';

    if (!viagens.length) {
      destinationOptions.innerHTML = '<p class="load-placeholder">Nenhuma viagem com cadastro aberto no momento.</p>';
      $('toStep1').disabled = true;
      return;
    }

    viagens.forEach((trip) => {
      const label = optionCard({
        name: 'destination',
        value: trip.id,
        title: trip.titulo,
        subtitle: trip.tipoLabel || trip.tipo
      });

      label.classList.remove('compact');
      label.querySelector('input').addEventListener('change', () => {
        selectedTrip = trip;
        chosenLabel = tripLabel(trip);
        maxReachedStep = 0;
        $('toStep1').disabled = false;
      });

      destinationOptions.appendChild(label);
    });
  };

  const renderRoomOptions = () => {
    if (!roomSec) return;
    roomSec.innerHTML = '';

    (selectedTrip?.quartos || []).slice(0, 4).forEach((room) => {
      roomSec.appendChild(optionCard({
        name: 'roomType',
        value: room.id || room.titulo,
        title: room.titulo,
        subtitle: [room.valor || room.price || '', room.descricao || room.description || ''].filter(Boolean).join(' - ')
      }));
    });
  };

  const renderEmbarkOptions = () => {
    const embarkOptions = $('embarkOptions');
    embarkOptions.innerHTML = '';

    (selectedTrip?.embarques || []).slice(0, 4).forEach((embark) => {
      embarkOptions.appendChild(optionCard({
        name: 'embarkLocation',
        value: [embark.nome, embark.cidade].filter(Boolean).join(' - '),
        title: embark.nome,
        subtitle: embark.cidade
      }));
    });
  };

  const currentVisibleStep = () => steps.findIndex((section) => !section.classList.contains('hidden'));

  const canLeaveCurrentStep = (showErrors = false) => {
    const currentStep = currentVisibleStep();

    if (currentStep === 1) return validateStep1(showErrors);
    if (currentStep === 2) return validateStep2(showErrors);
    if (currentStep === 3) return validateStep3(showErrors);
    return true;
  };

  const updateProgressBar = (index) => {
    if (index <= 0 || index >= 4) return;

    progLis.forEach((li, current) => {
      const stepNumber = current + 1;
      const canGoBack = stepNumber < index;
      const canGoForward = stepNumber > index && stepNumber <= maxReachedStep && canLeaveCurrentStep(false);
      const canClick = canGoBack || canGoForward;

      li.classList.toggle('active', stepNumber === index);
      li.classList.toggle('is-clickable', canClick);
      li.classList.toggle('is-locked', !canClick && stepNumber !== index);
      li.setAttribute('aria-current', stepNumber === index ? 'step' : 'false');
      li.setAttribute('aria-disabled', canClick ? 'false' : 'true');
      li.tabIndex = canClick ? 0 : -1;
    });
  };

  const refreshProgressBar = () => {
    updateProgressBar(currentVisibleStep());
  };

  const showStep = (index) => {
    steps.forEach((section, current) => section.classList.toggle('hidden', current !== index));
    document.body.classList.toggle('form-focused', index > 0);

    if (index > 0 && index < 4) {
      maxReachedStep = Math.max(maxReachedStep, index);
      header.classList.remove('hidden');
      title.textContent = chosenLabel;
      updateProgressBar(index);
    } else {
      header.classList.add('hidden');
    }
  };

  const goToStepFromProgress = (targetStep) => {
    const currentStep = currentVisibleStep();

    if (currentStep > 0 && currentStep < 4 && targetStep < currentStep) {
      showStep(targetStep);
      return;
    }

    if (currentStep > 0 && currentStep < 4 && targetStep > currentStep && targetStep <= maxReachedStep && canLeaveCurrentStep(true)) {
      if (targetStep === 2) initStep2();
      else showStep(targetStep);
    }
  };

  progLis.forEach((li, index) => {
    const targetStep = index + 1;

    li.addEventListener('click', () => goToStepFromProgress(targetStep));
    li.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      goToStepFromProgress(targetStep);
    });
  });

  const clearFieldError = (field) => {
    const wrapper = field.closest('.field') || field.parentNode;
    field.classList.remove('invalid');
    wrapper.querySelectorAll('.error-text').forEach((error) => error.remove());
  };

  const addFieldError = (field, message) => {
    const wrapper = field.closest('.field') || field.parentNode;
    field.classList.add('invalid');
    const error = document.createElement('small');
    error.className = 'error-text';
    error.textContent = message;
    wrapper.appendChild(error);
  };

  const selectedCompanions = () => {
    if (!companionsList) return [];
    return Array.from(companionsList.children).map((li) => li.firstChild.textContent.trim());
  };

  const syncGeneratedFields = () => {
    if (companionsField) companionsField.value = selectedCompanions().join('; ');
    if (signatureField && canvas) signatureField.value = canvas.toDataURL('image/png');
  };

  $('toStep1').onclick = () => {
    if (selectedTrip) showStep(1);
  };
  $('backToStep0').onclick = () => showStep(0);

  const validateStep1 = (showErrors = true) => {
    let ok = true;

    ['fullName', 'whatsapp', 'birthDate', 'rg', 'cpf'].forEach((id) => {
      const field = $(id);
      const value = field.value.trim();
      let message = '';

      if (showErrors) clearFieldError(field);

      if (!value) {
        message = 'Preencha este campo';
      } else if (id === 'birthDate' && !parseBirthDate(value)) {
        message = 'Informe uma data valida';
      } else if (id === 'cpf' && value.replace(/\D/g, '').length < 11) {
        message = 'CPF deve ter 11 dÒ­gitos';
      } else if (id === 'whatsapp') {
        const len = value.replace(/\D/g, '').length;
        if (len < 10 || len > 11) message = 'Informe 10 a 11 dÒ­gitos';
      }

      if (message) {
        ok = false;
        if (showErrors) addFieldError(field, message);
      }
    });

    return ok;
  };

  $('toStep2').onclick = () => {
    if (validateStep1()) initStep2();
  };

  $('backToStep1').onclick = () => showStep(1);

  ['fullName', 'whatsapp', 'birthDate', 'rg', 'cpf'].forEach((id) => {
    const field = $(id);
    field.addEventListener('input', refreshProgressBar);
    field.addEventListener('change', refreshProgressBar);
  });

  birthDateInput.addEventListener('input', () => {
    birthDateInput.value = formatBirthDate(birthDateInput.value);
    refreshProgressBar();
  });

  const updateCompanionState = () => {
    if (!soloChk || !companionsList || !next2Btn) return;
    next2Btn.disabled = !(soloChk.checked || companionsList.children.length > 0);
    refreshProgressBar();
  };

  const restoreCompanionControls = () => {
    if (!soloChk || !companionsList) return;

    if (soloChk.checked) {
      companionsList.innerHTML = '';
      companionInput.value = '';
      $('addCompanion').disabled = true;
    } else {
      $('addCompanion').disabled = false;
      soloChk.disabled = companionsList.children.length > 0;
    }

    updateCompanionState();
  };

  const validateStep2 = (showErrors = true) => {
    const embarkSec = $('embarkSection');
    const currentRoomSec = roomSec || $('roomOptions');
    const currentCompanionsBlock = companionsBlock || $('companionsBlock');
    const currentCompanionsList = companionsList || $('companionsList');
    const currentSoloChk = soloChk || $('soloTravel');
    let ok = true;

    if (showErrors) {
      currentRoomSec.querySelector('.error-text')?.remove();
      currentCompanionsBlock.querySelector('.error-text')?.remove();
      embarkSec.querySelector('.error-text')?.remove();
    }

    if (isHospedagem() && !currentRoomSec.querySelector('input[name="roomType"]:checked')) {
      ok = false;
      if (showErrors) {
        const error = document.createElement('small');
        error.className = 'error-text';
        error.textContent = 'Selecione o tipo de quarto';
        currentRoomSec.appendChild(error);
      }
    }

    if (!currentSoloChk.checked && currentCompanionsList.children.length === 0) {
      ok = false;
      if (showErrors) {
        const error = document.createElement('small');
        error.className = 'error-text';
        error.textContent = 'Adicione passageiro ou marque sozinho';
        currentCompanionsBlock.appendChild(error);
      }
    }

    if (!document.querySelector('input[name="embarkLocation"]:checked')) {
      ok = false;
      if (showErrors) {
        const error = document.createElement('small');
        error.className = 'error-text';
        error.textContent = 'Selecione o local de embarque';
        embarkSec.appendChild(error);
      }
    }

    return ok;
  };

  function initStep2() {
    const embarkSec = $('embarkSection');
    roomSec = $('roomOptions');
    const roomFieldset = roomSec.closest('fieldset');
    companionsBlock = $('companionsBlock');
    companionInput = $('companionName');
    companionsList = $('companionsList');
    soloChk = $('soloTravel');
    next2Btn = $('toStep3');
    renderRoomOptions();
    renderEmbarkOptions();

    if (isHospedagem()) {
      roomFieldset.classList.remove('hidden');
      roomSec.classList.remove('hidden');
    } else {
      roomFieldset.classList.add('hidden');
      roomSec.classList.add('hidden');
      roomSec.querySelectorAll('input[name="roomType"]').forEach((input) => {
        input.checked = false;
      });
    }

    embarkSec.classList.remove('hidden');
    roomSec.querySelectorAll('.error-text').forEach((error) => error.remove());
    companionsBlock.querySelectorAll('.error-text').forEach((error) => error.remove());
    restoreCompanionControls();

    $('addCompanion').onclick = () => {
      const name = companionInput.value.trim();
      if (!name) return;

      companionsBlock.querySelector('.error-text')?.remove();

      const li = document.createElement('li');
      li.textContent = name;

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn-remove';
      removeButton.textContent = 'Remover';
      removeButton.onclick = () => {
        li.remove();
        if (companionsList.children.length === 0) soloChk.disabled = false;
        updateCompanionState();
      };

      li.append(' ', removeButton);
      companionsList.appendChild(li);
      companionInput.value = '';
      soloChk.checked = false;
      soloChk.disabled = true;
      updateCompanionState();
    };

    soloChk.onchange = () => {
      companionsBlock.querySelector('.error-text')?.remove();

      if (soloChk.checked) {
        companionsList.innerHTML = '';
        companionInput.value = '';
        $('addCompanion').disabled = true;
      } else {
        $('addCompanion').disabled = false;
      }

      updateCompanionState();
    };

    next2Btn.onclick = () => {
      if (validateStep2()) showStep(3);
    };

    document.querySelectorAll('input[name="roomType"], input[name="embarkLocation"]').forEach((input) => {
      input.addEventListener('change', refreshProgressBar);
    });

    showStep(2);
  }

  const accept = $('acceptTerms');
  const canvas = $('signaturePad');
  const clear = $('clearSignature');
  const errSig = $('error-signature');
  const ctx = canvas.getContext('2d');
  let drawing = false;

  canvas.onpointerdown = () => {
    drawing = true;
  };

  canvas.onpointerup = () => {
    drawing = false;
    ctx.beginPath();
    refreshProgressBar();
  };

  canvas.onpointermove = (event) => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  clear.onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    errSig.style.display = 'none';
    refreshProgressBar();
  };

  accept.addEventListener('change', refreshProgressBar);

  const validateStep3 = (showErrors = true) => {
    if (showErrors) document.querySelector('.terms-accept .error-text')?.remove();
    let ok = true;

    if (!accept.checked) {
      ok = false;
      if (showErrors) {
        const error = document.createElement('small');
        error.className = 'error-text';
        error.textContent = 'VocÒª deve aceitar os termos';
        document.querySelector('.terms-accept').appendChild(error);
      }
    }

    const blank = ctx.getImageData(0, 0, canvas.width, canvas.height).data.every((value) => value === 0);
    if (blank) {
      ok = false;
      if (showErrors) errSig.style.display = 'block';
    }

    return ok;
  };

  $('backToStep2').onclick = () => showStep(2);

  $('toSubmit').onclick = async () => {
    if (!validateStep3()) return;

    syncGeneratedFields();

    const submitButton = $('toSubmit');
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';

    const data = new FormData(form);
    data.set('companions', companionsField?.value || '');
    data.set('signature', signatureField?.value || '');
    data.set('destination', chosenLabel);
    data.set('destinationId', selectedTrip?.id || '');
    data.set('tripType', selectedTrip?.tipoLabel || selectedTrip?.tipo || '');
    data.set('tripDate', selectedTrip?.data || selectedTrip?.ida || selectedTrip?.date || '');
    data.set('selectedTrip', JSON.stringify(selectedTrip || {}));
    const lapChild = isLapChildPassenger();
    data.set('passageiroColo', lapChild ? 'sim' : 'nao');
    data.set('tipoPassageiro', lapChild ? 'colo' : 'vaga');
    data.set('ocupaVaga', lapChild ? 'nao' : 'sim');
    data.set('passageiroColoCalculadoEm', new Date().toISOString());

    try {
      await postSupabaseRegistration(data);
      showStep(4);
    } catch (error) {
      console.error('Cadastro Supabase indisponivel:', error);
      alert('Nao foi possivel salvar seu cadastro agora. Tente novamente em alguns minutos.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Enviar';
    }
  };

  $('cpf').addEventListener('input', (event) => {
    let value = event.target.value.replace(/\D/g, '').slice(0, 11);
    value = value
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    event.target.value = value;
  });

  const whatsapp = $('whatsapp');
  whatsapp.addEventListener('input', (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 11);
    event.target.value = value.length < 3 ? `(${value}` : `(${value.slice(0, 2)})${value.slice(2)}`;
    whatsapp.setCustomValidity('');
  });

  whatsapp.addEventListener('blur', (event) => {
    const len = event.target.value.replace(/\D/g, '').length;
    whatsapp.setCustomValidity(len < 10 || len > 11 ? 'Digite 10 a 11 dÒ­gitos' : '');
  });

  loadTravelConfig()
    .then((config) => {
      viagens = Array.isArray(config.viagens) ? config.viagens : [];
      renderDestinationOptions();
      showStep(0);
    })
    .catch((error) => {
      console.error('Erro ao carregar viagens.json:', error);
      destinationOptions.innerHTML = '<p class="load-error">NÒ£o foi possÒ­vel carregar as viagens. Tente recarregar a pÒ¡gina.</p>';
      $('toStep1').disabled = true;
      showStep(0);
    });
});
