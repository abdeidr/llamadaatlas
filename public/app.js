document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT_API_KEY = 'key_cff09c3d7da5a891766529deded1';
  const DEFAULT_AGENT_ID = 'agent_28776daceffa9dfdffdfe9397d';

  let retellWebClient = null;
  let isWebCallActive = false;
  let isMuted = false;
  let callTimerInterval = null;
  let callSeconds = 0;

  // Elementos DOM
  const leadForm = document.getElementById('leadForm');
  const btnTestWebCall = document.getElementById('btnTestWebCall');
  const btnEndWebCall = document.getElementById('btnEndWebCall');
  const btnMuteWeb = document.getElementById('btnMuteWeb');
  const webCallControls = document.getElementById('webCallControls');

  const voiceOrb = document.getElementById('voiceOrb');
  const callTimer = document.getElementById('callTimer');
  const speakerState = document.getElementById('speakerState');
  const liveIndicator = document.getElementById('liveIndicator');
  const callStatusText = document.getElementById('callStatusText');
  const jsonPreview = document.getElementById('jsonPreview');
  const btnCopyJson = document.getElementById('btnCopyJson');
  const historyList = document.getElementById('historyList');
  const historyCount = document.getElementById('historyCount');

  loadHistory();
  updateJsonPreview();

  // Actualizar vista previa del JSON en cada cambio del formulario
  leadForm.addEventListener('input', updateJsonPreview);

  function getFormData() {
    const formData = new FormData(leadForm);
    const toNumber = formData.get('to_number')?.trim() || '';
    return {
      to_number: toNumber,
      retell_llm_dynamic_variables: {
        user_number: toNumber,
        telefono: toNumber,
        to_number: toNumber,
        lead_name: formData.get('lead_name')?.trim() || '',
        modalidad: formData.get('modalidad')?.trim() || '',
        preferencia_pago: formData.get('preferencia_pago')?.trim() || '',
        duda_principal: formData.get('duda_principal')?.trim() || '',
        tipo_dolor: formData.get('tipo_dolor')?.trim() || '',
        desde_hace_cuanto: formData.get('desde_hace_cuanto')?.trim() || '',
        objetivo_principal: formData.get('objetivo_principal')?.trim() || '',
        sintomas_principales: formData.get('sintomas_principales')?.trim() || '',
        available_time: formData.get('available_time')?.trim() || ''
      }
    };
  }

  function updateJsonPreview() {
    const data = getFormData();
    jsonPreview.textContent = JSON.stringify(data.retell_llm_dynamic_variables, null, 2);
  }

  btnCopyJson.addEventListener('click', () => {
    navigator.clipboard.writeText(jsonPreview.textContent);
    btnCopyJson.textContent = '✅ Copiado';
    setTimeout(() => { btnCopyJson.textContent = '📋 Copiar'; }, 2000);
  });

  // ----------------------------------------------------
  // PROBAR AGENTE EN LA WEB (WEBRTC LIVE TEST)
  // ----------------------------------------------------
  btnTestWebCall.addEventListener('click', async () => {
    const formPayload = getFormData();

    if (isWebCallActive) {
      alert('Ya hay una llamada web en curso.');
      return;
    }

    updateCallState('calling', 'Iniciando Web Call...', 'Conectando con Retell AI...');
    btnTestWebCall.disabled = true;

    try {
      // 1. Obtener Access Token de Retell para Web Call
      const res = await fetch('/api/retell/create-web-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: DEFAULT_API_KEY,
          agentId: DEFAULT_AGENT_ID,
          retell_llm_dynamic_variables: formPayload.retell_llm_dynamic_variables
        })
      });

      const data = await res.json();
      if (!res.ok || !data.access_token) {
        throw new Error(data.error || 'No se pudo crear la llamada web.');
      }

      console.log('✅ Access token obtenido:', data.access_token);

      // 2. Inicializar Retell Web Client SDK
      const RetellClient = window.RetellSDK?.RetellWebClient || window.RetellWebClient || window.retellClientJsSdk?.RetellWebClient;
      if (!RetellClient) {
        throw new Error('SDK de Retell no disponible. Por favor recarga la página.');
      }

      retellWebClient = new RetellClient();

      retellWebClient.on('call_started', () => {
        console.log('📞 Llamada Web iniciada.');
        isWebCallActive = true;
        btnTestWebCall.disabled = false;
        btnTestWebCall.classList.add('hidden');
        webCallControls.classList.remove('hidden');
        startTimer();
        updateCallState('active', 'En llamada activa', 'Agente escuchando...');
      });

      retellWebClient.on('agent_start_talking', () => {
        voiceOrb.classList.add('active');
        speakerState.textContent = 'Agente hablando...';
      });

      retellWebClient.on('agent_stop_talking', () => {
        voiceOrb.classList.remove('active');
        speakerState.textContent = 'Agente escuchando...';
      });

      retellWebClient.on('call_ended', () => {
        console.log('⏹️ Llamada finalizada.');
        endWebCallUI();
      });

      retellWebClient.on('error', (err) => {
        console.error('Error Retell Web Client:', err);
        alert('Error en llamada web: ' + JSON.stringify(err));
        endWebCallUI();
      });

      // 3. Conectar micrófono y audio
      await retellWebClient.startCall({
        accessToken: data.access_token
      });

      loadHistory();

    } catch (err) {
      console.error('Error iniciando Web Call:', err);
      alert('Error: ' + err.message);
      btnTestWebCall.disabled = false;
      updateCallState('idle', 'Inactivo', 'Listo para iniciar');
    }
  });

  // Botón colgar llamada web
  btnEndWebCall.addEventListener('click', () => {
    if (retellWebClient) {
      retellWebClient.stopCall();
    }
    endWebCallUI();
  });

  // Botón silenciar micrófono
  btnMuteWeb.addEventListener('click', () => {
    isMuted = !isMuted;
    btnMuteWeb.classList.toggle('active', isMuted);
    btnMuteWeb.textContent = isMuted ? '🔇' : '🎙️';
    if (retellWebClient) {
      if (isMuted) retellWebClient.mute();
      else retellWebClient.unmute();
    }
  });

  function endWebCallUI() {
    isWebCallActive = false;
    stopTimer();
    voiceOrb.classList.remove('active');
    btnTestWebCall.disabled = false;
    btnTestWebCall.classList.remove('hidden');
    webCallControls.classList.add('hidden');
    updateCallState('idle', 'Inactivo', 'Llamada finalizada');
    loadHistory();
  }

  // Helpers
  function updateCallState(state, statusBadgeText, speakerText) {
    liveIndicator.className = 'live-indicator ' + state;
    callStatusText.textContent = statusBadgeText;
    if (speakerText) speakerState.textContent = speakerText;
  }

  function startTimer() {
    callSeconds = 0;
    callTimer.textContent = '00:00';
    clearInterval(callTimerInterval);
    callTimerInterval = setInterval(() => {
      callSeconds++;
      const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
      const secs = String(callSeconds % 60).padStart(2, '0');
      callTimer.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  function stopTimer() {
    clearInterval(callTimerInterval);
  }

  async function loadHistory() {
    try {
      const res = await fetch('/api/calls');
      const list = await res.json();
      historyCount.textContent = list.length;

      if (list.length === 0) {
        historyList.innerHTML = '<p class="empty-text">No se han iniciado pruebas en esta sesión.</p>';
        return;
      }

      historyList.innerHTML = list.map(item => `
        <div class="history-item">
          <div>
            <div class="hist-main">🎙️ Prueba Web: ${item.variables?.lead_name || 'Paciente'}</div>
            <div class="hist-sub">Dolor: ${item.variables?.tipo_dolor || 'Consulta'} • ${new Date(item.created_at).toLocaleTimeString()}</div>
          </div>
          <span class="hist-badge">Web Call</span>
        </div>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }
});
