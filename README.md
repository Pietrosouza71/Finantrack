# FINANTRACK

**Controle financeiro pessoal, simples e visual.** O FinanTrack é um projeto de portfólio feito para demonstrar fundamentos de desenvolvimento web, organização de dados e criação de interfaces responsivas.

> Tenha controle do seu dinheiro, tome decisões melhores.

## Demonstração

Acesse o [site publicado no GitHub Pages](https://pietrosouza71.github.io/Finantrack/) ou abra `index.html` no navegador para navegar pela apresentação, painel, movimentações e relatórios. Na página inicial, use **Explorar demonstração** para carregar registros fictícios e visualizar os gráficos preenchidos.

## Captura de tela

![Página inicial do FINANTRACK, com o menu, a apresentação e os cards de funcionalidades](docs/images/homepage.png)

### Telas do projeto

- **Início:** apresentação do projeto e acesso rápido ao painel.
- **Painel:** saldo, receitas, despesas, economia, gráficos e movimentações recentes.
- **Movimentações:** cadastro, edição, exclusão, pesquisa e filtros de período e tipo.
- **Relatórios:** gastos por categoria, entradas e saídas mensais e evolução do saldo acumulado.

## Funcionalidades

- Cadastro de receitas e despesas com valor, categoria, descrição e data.
- Edição e exclusão de registros individuais.
- Filtros de período no painel e nos relatórios; pesquisa e filtros por tipo e período na lista.
- Gráficos atualizados automaticamente com Chart.js.
- Persistência no LocalStorage do navegador.
- Dados de demonstração e opção para limpar os registros.
- Interface adaptável a celular, tablet e desktop, em português brasileiro.

## Tecnologias

- HTML5 semântico
- CSS3 (layout responsivo, animações e tema escuro)
- JavaScript puro (ES6+)
- [Chart.js 4](https://www.chartjs.org/) para visualização dos dados
- LocalStorage para persistência local

## Como executar

1. Baixe ou clone este repositório.
2. Abra `index.html` em um navegador moderno.
3. Para uma experiência de desenvolvimento local, abra a pasta no VS Code e use a extensão **Live Server** (ou qualquer servidor estático).
4. A biblioteca Chart.js é carregada por CDN; a conexão com a internet é necessária para exibir os gráficos. Os registros continuam salvos no navegador.

Não é necessário instalar dependências nem configurar um servidor de aplicação.

## Organização dos arquivos

```text
FinanTrack/
├── index.html   # Estrutura das páginas, formulários e áreas dos gráficos
├── styles.css   # Identidade visual, componentes e responsividade
├── app.js       # Estado, LocalStorage, cálculos, filtros e gráficos
├── README.md    # Documentação do projeto
├── docs/
│   └── images/
│       └── homepage.png # Captura da página inicial publicada
└── .gitignore   # Arquivos locais ignorados pelo Git
```

## Como os dados e cálculos funcionam

Cada movimentação contém `id`, `type`, `amount`, `category`, `description` e `date`. O aplicativo guarda uma lista desses objetos na chave `finantrack-transactions-v1` do LocalStorage. Assim, os registros permanecem disponíveis no mesmo navegador e dispositivo.

O saldo e a economia do período são calculados como **soma das receitas − soma das despesas**. Os filtros selecionam os registros antes dos totais e gráficos serem atualizados. Os gráficos são recriados a partir dos dados atuais quando a lista ou o período muda.

## Publicar no GitHub

1. Crie um repositório público no GitHub com o nome `finantrack`.
2. Na pasta do projeto, inicialize o Git e envie os arquivos:

```bash
git init
git add index.html styles.css app.js README.md .gitignore
git commit -m "feat: cria o FinanTrack"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/finantrack.git
git push -u origin main
```

3. Para publicar o site sem custo, acesse **Settings → Pages**, selecione a branch `main` e a pasta `/ (root)`, e salve. O GitHub Pages publicará o `index.html`.

## Observações

- Os dados ficam somente no armazenamento local do navegador; não há conta, backend ou sincronização entre dispositivos.
- Use **Limpar dados** para apagar todos os registros deste navegador.
- Este é um projeto de estudo e portfólio, não uma ferramenta de aconselhamento financeiro.
