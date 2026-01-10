// js/supabaseClient.js

// Configurações e Chaves
const PROJECT_URL = 'https://jbtqvheeeqtiovakfqcn.supabase.co'; 
const PROJECT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidHF2aGVlZXF0aW92YWtmcWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODcxNzEsImV4cCI6MjA4MTU2MzE3MX0.T93A20M56NiKamag6FW6q1T2YnFiSu5s3snFGMSsIHQ'; 

// Inicializa o cliente globalmente
const supabaseClient = window.supabase.createClient(PROJECT_URL, PROJECT_KEY);

// Log para debug (opcional)
console.log("Supabase Conectado 🟢");