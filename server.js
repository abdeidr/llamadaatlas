import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const CALLS_LOG_FILE = path.join(DATA_DIR, 'calls.json');

const DEFAULT_RETELL_API_KEY = process.env.RETELL_API_KEY || 'key_cff09c3d7da5a891766529deded1';
const DEFAULT_AGENT_ID = process.env.RETELL_AGENT_ID || 'agent_28776daceffa9dfdffdfe9397d';



if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getSavedCalls() {
  try {
    if (!fs.existsSync(CALLS_LOG_FILE)) return [];
    return JSON.parse(fs.readFileSync(CALLS_LOG_FILE, 'utf-8') || '[]');
  } catch (e) {
    return [];
  }
}

function saveCallLog(callRecord) {
  try {
    const list = getSavedCalls();
    list.unshift(callRecord);
    fs.writeFileSync(CALLS_LOG_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error guardando historial:', e);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Obtener configuración actual
app.get('/api/config', (req, res) => {
  res.json({
    hasApiKey: Boolean(process.env.RETELL_API_KEY && process.env.RETELL_API_KEY.trim().length > 0),
    agentId: process.env.RETELL_AGENT_ID || 'agent_28776daceffa9dfdffdfe9397d',
    fromNumber: process.env.RETELL_FROM_NUMBER || ''
  });
});

// Guardar configuración en memoria y entorno
app.post('/api/config', (req, res) => {
  const { apiKey, agentId, fromNumber } = req.body;
  if (apiKey) process.env.RETELL_API_KEY = apiKey.trim();
  if (agentId) process.env.RETELL_AGENT_ID = agentId.trim();
  if (fromNumber !== undefined) process.env.RETELL_FROM_NUMBER = fromNumber.trim();

  res.json({
    success: true,
    message: 'Configuración actualizada',
    config: {
      hasApiKey: Boolean(process.env.RETELL_API_KEY),
      agentId: process.env.RETELL_AGENT_ID,
      fromNumber: process.env.RETELL_FROM_NUMBER
    }
  });
});

// ----------------------------------------------------
// 1. LLAMADA TELEFÓNICA REAL (OUTBOUND PHONE CALL)
// ----------------------------------------------------
app.post('/api/retell/create-phone-call', async (req, res) => {
  const apiKey = req.body.apiKey || process.env.RETELL_API_KEY;
  const agentId = req.body.agentId || process.env.RETELL_AGENT_ID || 'agent_28776daceffa9dfdffdfe9397d';
  const fromNumber = req.body.from_number || process.env.RETELL_FROM_NUMBER;
  const toNumber = req.body.to_number;
  const dynamicVars = req.body.retell_llm_dynamic_variables || {};

  if (!apiKey) {
    return res.status(400).json({ error: 'Falta la RETELL_API_KEY. Configúrala en .env o en la interfaz.' });
  }

  if (!toNumber) {
    return res.status(400).json({ error: 'Debes indicar el número de teléfono del lead (to_number) en formato +34...' });
  }

  if (!fromNumber) {
    return res.status(400).json({
      error: 'Debes configurar tu número de origen de Retell (from_number). Puedes comprarlo o importarlo en Retell Dashboard > Phone Numbers.'
    });
  }

  const payload = {
    from_number: fromNumber,
    to_number: toNumber,
    override_agent_id: agentId,
    retell_llm_dynamic_variables: dynamicVars
  };

  console.log('📞 Lanzando llamada telefónica en Retell AI:', payload);

  try {
    const response = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error de Retell Phone Call:', data);
      return res.status(response.status).json({
        error: data.message || data.error || 'Error al crear la llamada telefónica en Retell AI',
        details: data
      });
    }

    const logRecord = {
      type: 'phone_call',
      call_id: data.call_id,
      created_at: new Date().toISOString(),
      to_number: toNumber,
      from_number: fromNumber,
      agent_id: agentId,
      variables: dynamicVars,
      response: data
    };
    saveCallLog(logRecord);

    console.log('✅ Llamada telefónica creada con éxito en Retell. Call ID:', data.call_id);
    res.json({
      success: true,
      message: 'Llamada telefónica lanzada con éxito a ' + toNumber,
      data
    });
  } catch (err) {
    console.error('Error de red al llamar a Retell:', err);
    res.status(500).json({ error: 'Error de servidor: ' + err.message });
  }
});

// ----------------------------------------------------
// 2. PRUEBA EN NAVEGADOR (WEB CALL WEBRTC)
// ----------------------------------------------------
app.post('/api/retell/create-web-call', async (req, res) => {
  const apiKey = req.body.apiKey || process.env.RETELL_API_KEY;
  const agentId = req.body.agentId || process.env.RETELL_AGENT_ID || 'agent_28776daceffa9dfdffdfe9397d';
  const dynamicVars = req.body.retell_llm_dynamic_variables || {};

  if (!apiKey) {
    return res.status(400).json({ error: 'Falta la RETELL_API_KEY. Configúrala en .env o en la interfaz.' });
  }

  const payload = {
    agent_id: agentId,
    retell_llm_dynamic_variables: dynamicVars
  };

  console.log('🎙️ Creando sesión Web Call en Retell AI:', payload);

  try {
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error de Retell Web Call:', data);
      return res.status(response.status).json({
        error: data.message || data.error || 'Error al crear la llamada web en Retell AI',
        details: data
      });
    }

    const logRecord = {
      type: 'web_call',
      call_id: data.call_id,
      created_at: new Date().toISOString(),
      agent_id: agentId,
      variables: dynamicVars,
      response: data
    };
    saveCallLog(logRecord);

    console.log('✅ Web Call lista para conectar en navegador. Call ID:', data.call_id);
    res.json({
      success: true,
      access_token: data.access_token,
      call_id: data.call_id
    });
  } catch (err) {
    console.error('Error de red en create-web-call:', err);
    res.status(500).json({ error: 'Error de servidor: ' + err.message });
  }
});

// Obtener historial de llamadas
app.get('/api/calls', (req, res) => {
  res.json(getSavedCalls());
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Retell Voice Agent Hub Activo`);
  console.log(`🌐 Panel: http://localhost:${PORT}`);
  console.log(`🤖 Agent ID: ${process.env.RETELL_AGENT_ID || 'agent_28776daceffa9dfdffdfe9397d'}`);
  console.log(`======================================================\n`);
});
