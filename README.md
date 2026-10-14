# Art Space 3D — Catálogo Digital

Catálogo digital com finalização de pedido via **WhatsApp** e um **painel
administrativo** para cadastrar peças, definir preços e precificar impressões 3D.

> _Não apenas imprimimos objetos. Materializamos ideias._
> Identidade visual conforme o Manual de Marca da Art Space 3D (Laranja Cobre,
> Cinza Chumbo, Gelo e Grafite · tipografia Montserrat).

## Funcionalidades

- **Vitrine / catálogo** (`/`): busca, filtro por categoria, cards com preço e
  promoção.
- **Página da peça** (`/produto/[slug]`): fotos, descrição, variações (tamanho,
  cor, etc.) com ajuste de preço, quantidade e "comprar agora".
- **Carrinho + checkout** (`/carrinho`): o pedido é montado e enviado pronto
  pelo **WhatsApp** (link `wa.me`), com nome do cliente, itens, total, forma de
  entrega (retirar/receber) e observações.
- **Painel admin** (`/admin`, protegido por PIN):
  - **Produtos**: cadastrar, editar, ativar/desativar e excluir peças, com
    imagens (upload ou URL), variações e preço promocional.
  - **Precificação**: calculadora de custo da peça (filamento, tempo de
    impressão, máquina, mão de obra, extras e margem) que sugere o preço de
    venda.
  - **Categorias**: criar e organizar categorias.
  - **Configurações**: número de WhatsApp, dados da loja, textos de entrega,
    chave Pix e PIN de acesso.
  - **Backup**: exportar/importar o catálogo em JSON e restaurar o exemplo.

## Como os dados são salvos

Para rodar sem backend/custo, o catálogo é persistido no **navegador**
(`localStorage`). Isso é ideal para um operador único gerenciar a loja a partir
do próprio dispositivo. Para publicar o catálogo de forma compartilhada entre
vários clientes/dispositivos, use **Exportar JSON** no painel e evolua para um
banco de dados (ex.: Vercel KV/Postgres) — a camada de dados está isolada em
`components/StoreProvider.tsx` e `lib/`, facilitando a troca.

## Configuração essencial

Antes de divulgar a loja, abra **`/admin` → Configurações** e informe o
**número de WhatsApp** (DDI + DDD + número, só dígitos — ex.: `5547999999999`).
Sem isso, o checkout fica bloqueado. PIN padrão do admin: `art3d` (troque nas
configurações).

## Rodando localmente

```bash
npm install
npm run dev   # http://localhost:3000
```

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4.
Deploy alvo: Vercel.
