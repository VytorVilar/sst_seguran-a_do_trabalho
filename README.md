# SST Prime — Nova versão premium

Site reconstruído do zero em HTML, CSS e JavaScript puro, preservando as informações do projeto original.

## Recursos

- Login moderno e responsivo.
- Senha padrão: `SG393`.
- Dashboard com indicadores automáticos.
- Catálogo completo de EPIs com pesquisa, categorias, favoritos, modo compacto e modal.
- Riscos, empresas, 5W2H, NRs e painel de recursos.
- Gerador de frases com empresa e data.
- Busca global com `Ctrl + K`.
- Atalhos de navegação: `Alt + 1` até `Alt + 8`.
- Tema claro/escuro persistente.
- Layout adaptado para desktop, tablet e celular.
- Service Worker para cache dos arquivos locais.
- Conversor local de Word (.docx) para PDF e de PDF com texto selecionável para Word (.docx).
- Os arquivos do conversor são processados no próprio navegador e não são enviados para servidores externos.
- Sem frameworks ou dependências JavaScript externas.

## Estrutura

```text
SST_PRIME_NOVO/
├── index.html
├── manifest.webmanifest
├── sw.js
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── converter.js
│   └── data.js
├── vendor/
│   ├── converter-engine.js
│   └── pdf.worker.min.mjs
└── assets/
    └── mascote-sst-premium.gif
```

## Como executar

Para uma visualização simples, abra `index.html`.

Para testar o cache offline e evitar limitações do navegador, use um servidor local:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Publicação no GitHub Pages

Envie o conteúdo da pasta para o repositório e ative o GitHub Pages na branch principal.

> O login é executado no navegador e serve como controle visual. Para autenticação real, é necessário um backend.

## Observações sobre o conversor

- Word para PDF aceita arquivos `.docx`. Documentos com elementos muito complexos podem apresentar pequenas diferenças de layout.
- PDF para Word extrai texto editável. PDFs escaneados como imagem precisam de OCR e não possuem conversão automática nesta versão.
- Limite recomendado por arquivo: 25 MB.
