# 🛡️ Guia Oficial Passo a Passo - Sistema de Afiliados WL TEC Ofertas

Este documento foi criado para você consultar com calma e seguir no seu tempo. **Nenhuma alteração foi commitada no Git**, tudo está seguro e pronto no seu ambiente local.

---

## 📌 1. Entendendo a URL do Site (Shopee, Amazon e Mercado Livre)

### Por que a Shopee só aceitou `https://wl.tec.br/` e não `https://wl.tec.br/ofertas/`?
> [!NOTE]
> **Isso é 100% normal e é a forma correta.**
> Todas as grandes plataformas de afiliados (Shopee, Amazon, Meta/Facebook, Google) exigem o **Domínio Raiz (Root Domain)** no cadastro de canais. Elas não aceitam caminhos de pastas internas (como `/ofertas/` ou `/produtos/`) porque o sistema valida a **entidade do domínio**.

### Isso prejudica o rastreamento ou as comissões?
**NÃO, DE FORMA ALGUMA!** 
- Quando o visitante clica no seu link de afiliado dentro de `https://wl.tec.br/ofertas/`, o navegador envia um cabeçalho chamado `Referer: https://wl.tec.br/ofertas/...`.
- O robô da Shopee analisa apenas o domínio de origem (`wl.tec.br`). Como você cadastrou `https://wl.tec.br/`, todas as vendas vindas de qualquer página interna são aprovadas e comissionadas normalmente.

### Por que a pasta (`wl.tec.br/ofertas/`) é muito melhor que um subdomínio (`ofertas.wl.tec.br`)?
1. **Autoridade no Google (SEO):** O Google transfere a idade, relevância e confiança de `wl.tec.br` diretamente para as páginas de produtos. Se criássemos um subdomínio novo, o Google o trataria como um site recém-nascido (Autoridade 0), levando meses para indexar.
2. **Zero complicação de DNS:** Você não precisa criar novos apontamentos de CNAME ou novos certificados SSL no Cloudflare.

---

## 🔑 2. Seus IDs Oficiais Configurados no Sistema

Já atualizamos todos os arquivos do projeto com seus dados reais:
- **Shopee Affiliate ID:** `18349700720` (Usuário: `wilbade`)
- **Amazon Associate Tag Oficial:** `wilbade09-20` (Criada e aprovada com 180 dias de prazo)
- **AliExpress Tracking ID:** `wilbade`
- **Mercado Livre Tag:** `wilbade` (Ferramenta: `83539355`)

---

## 🚀 3. Passo a Passo para Subir o Sistema (Faça no seu tempo)

### Passo 1: Rodar o Banco no Supabase (Leva 1 minuto)
1. Acesse seu painel: **[https://supabase.com/dashboard/project/giikoiqpnzgmhcqiuvhs](https://supabase.com/dashboard/project/giikoiqpnzgmhcqiuvhs)**
2. No menu lateral esquerdo, clique no ícone **SQL Editor** (ícone `>_`).
3. Clique em **+ New Query**.
4. Abra o arquivo local `supabase/schema-afiliados.sql`, copie todo o conteúdo e cole no editor do Supabase.
5. Clique no botão verde **Run** (ou pressione `Ctrl + Enter`).
6. *Resultado:* As 4 tabelas (`afiliados_config`, `afiliados_produtos`, `afiliados_cupons`, `afiliados_acessos`) serão criadas com regras de segurança RLS automáticas.

---

### Passo 2: Testar Tudo Localmente no "Go Live"
1. No seu VS Code, inicie o **Go Live** (porta padrão `5500`).
2. Abra a Vitrine Pública no navegador:
   👉 `http://127.0.0.1:5500/ofertas/`
   - Verifique as 10 fotos reais dos produtos (Balança com display digital, Creatina no pacote preto, Mini Compressor portátil, Camiseta dobrada, etc.).
   - Teste a aba de cupons diários com o botão "Copiar & Abrir".
3. Abra um Review de produto:
   👉 `http://127.0.0.1:5500/ofertas/produto.html?slug=creatina-monohidratada-1kg-100-pura-soldiers-nutrition`
   - Teste a galeria interativa de fotos.
   - Veja o comparador de preços das 4 lojas.
4. Acesse a Mesa de Operações (Admin):
   👉 `http://127.0.0.1:5500/ofertas/admin.html`
   - Note que ela está **protegida por senha e invisível para visitantes normais** (sem botões no menu público).
   - Entre com suas credenciais ou teste em modo local.
   - Na aba **⚙️ IDs de Afiliado**, você verá que `wilbade09-20`, `18349700720` e `wilbade` já estão salvos.

---

### Passo 3: Criar seu Grupo VIP de Promoções
1. No seu WhatsApp, crie um **Canal** ou **Grupo** chamado: `WL TEC | Achados & Cupons VIP`.
2. Configure para que apenas administradores possam postar mensagens (evita spam e bate-papo).
3. Copie o link de convite do grupo (ex: `https://chat.whatsapp.com/...`).
4. Abra a Mesa de Operações (`admin.html`), vá na aba **IDs de Afiliado**, cole o link no campo de WhatsApp e clique em **Salvar Configurações Globais**.
5. Todos os botões "Entrar no Canal VIP" de todo o site passarão a apontar diretamente para o seu grupo!

---

### Passo 4: Publicar o Site na Internet
Quando você estiver 100% satisfeito com o teste no Go Live:
1. Faça o commit e push dos arquivos no Git.
2. Como o site já roda na hospedagem atual (Cloudflare / GitHub Pages / Firebase), a pasta `/ofertas/` entrará no ar instantaneamente sem precisar criar subdomínio.
3. No Google Search Console: envie `https://wl.tec.br/sitemap.xml` para o Google indexar a vitrine e os reviews.

---

## ⏱️ 4. A Rotina Operacional de 15 Minutos por Dia

Para quem trabalha na correria da moto e bancada de TI, este sistema foi desenhado para não tomar tempo:

1. **Pela manhã (5 minutos):**
   - Acesse `wl.tec.br/ofertas/admin.html`.
   - Clique no botão `🔥 Rastrear Tendências 48h` ou cole o link de um produto em alta.
   - A IA preenche título, prós/contras, especificações e cruza os preços.
   - Clique em `Aprovar & Publicar`.

2. **Divulgação Instantânea (2 minutos):**
   - Na mesma tela, clique no botão verde: `[📲 Copiar p/ WhatsApp]`.
   - Abra seu WhatsApp Web e cole no seu Grupo VIP. O texto já sai com emojis, preço antigo riscado, desconto e o seu link de afiliado rastreado.

3. **Automação de Limpeza (Zero esforço):**
   - O algoritmo verifica a cada 45 dias se algum produto ficou sem cliques. Se ficou, ele arquiva sozinho para o seu site nunca ter produto desatualizado ou com preço morto.
