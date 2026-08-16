# 🎙️ Retell AI Lead Form & Voice Agent Launcher

Aplicación web y disparador de llamadas salientes con **Retell AI** (`agent_28776daceffa9dfdffdfe9397d`) para captación de leads de Meta Ads del **Centro Osteopático Atlas**.

---

## 📋 Variables Dinámicas Inyectadas a Retell

El formulario recoge y envía automáticamente todas las variables dinámicas al agente en el objeto `retell_llm_dynamic_variables`:

```json
{
  "lead_name": "Carlos Mendoza",
  "modalidad": "Presencial en Pozuelo de Alarcón",
  "preferencia_pago": "Tiene dudas antes de pagar",
  "duda_principal": "¿Cómo combinan la osteopatía con la fisioterapia y naturopatía?",
  "tipo_dolor": "Hernia discal lumbar L5-S1 con ciática",
  "desde_hace_cuanto": "Más de 6 meses",
  "objetivo_principal": "Evitar cirugía y volver a caminar sin dolor",
  "sintomas_principales": "Dolor punzante en glúteo que baja a la pierna, adormecimiento de pie",
  "available_time": "Por la mañana antes de las 13:00"
}
```

---

## 🚀 Acciones Disponibles

1. **🎙️ Probar Agente en la Web (Gratis sin saldo telefónico)**:
   - Utiliza la API `POST https://api.retellai.com/v2/create-web-call` y el Web Client SDK (WebRTC).
   - Te permite hablar directamente con tu agente de Retell desde el micrófono de tu navegador con latencia ultra baja.

2. **📞 Lanzar Llamada Telefónica Real**:
   - Utiliza la API `POST https://api.retellai.com/v2/create-phone-call`.
   - Envía `from_number` (tu número en Retell), `to_number` (el móvil del lead), `override_agent_id` (`agent_28776daceffa9dfdffdfe9397d`) y las `retell_llm_dynamic_variables`.

---

## ⚙️ Puesta en Marcha

1. Introduce tu **Retell API Key** en el archivo `.env` o en la ventana de **⚙️ Configuración** en la web:
   ```env
   RETELL_API_KEY=key_tu_clave_aqui
   RETELL_AGENT_ID=agent_28776daceffa9dfdffdfe9397d
   RETELL_FROM_NUMBER=+34910000000
   PORT=3000
   ```

2. Inicia el servidor:
   ```bash
   npm start
   ```

3. Abre en tu navegador:
   👉 **[http://localhost:3000](http://localhost:3000)**
