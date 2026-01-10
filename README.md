# NEC System - ERP & Rastreamento para Marcenaria

Sistema web completo para gestão de marcenaria, incluindo controle de produção, financeiro (ERP), geração de relatórios e rastreamento de pedidos em tempo real para o cliente final.

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![Tech](https://img.shields.io/badge/Tech-HTML5_|_Tailwind_|_Supabase-blue)

## 🎯 Funcionalidades

### 🏢 Painel Administrativo (ERP)
- **Login Seguro:** Autenticação via Supabase Auth.
- **Gestão de Produção:** Criação de contratos e controle de etapas (Projeto, Corte, Pintura, Montagem).
- **Financeiro Completo:**
  - Contas a Receber (vínculo com projetos).
  - Contas a Pagar (vínculo com fornecedores).
  - Dashboard com KPI de Saldo e Previsão.
- **Automação:**
  - Geração de Relatórios em PDF com 1 clique.
  - Envio de status via WhatsApp Web automático.
  - Upload de Renders 3D/Fotos para a nuvem.

### 🏠 Área do Cliente (Site Público)
- **Rastreador de Pedidos:** Busca via CPF.
- **Timeline Visual:** Cliente vê exatamente em qual etapa o móvel está.
- **Visualização 3D:** Acesso ao render do projeto aprovado.
- **Landing Page:** Vitrine da empresa com portfólio e captura de leads.

---

## 🚀 Tecnologias Utilizadas

- **Frontend:** HTML5, JavaScript (Vanilla ES6+).
- **Estilização:** Tailwind CSS (via CDN).
- **Backend (BaaS):** Supabase (Database, Auth, Storage).
- **Bibliotecas:**
  - `SweetAlert2` (Alertas bonitos).
  - `jspdf` (Geração de relatórios).
  - `AOS` (Animações ao rolar).
  - `FontAwesome` (Ícones).

---

## 🛠️ Instalação e Configuração

### 1. Clonar o Repositório
```bash
git clone [https://github.com/SEU-USUARIO/nec-system.git](https://github.com/SEU-USUARIO/nec-system.git)
cd nec-system
