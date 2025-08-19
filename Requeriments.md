# Prompt para Cursor: Dashboard Tria

Crie um dashboard médico completo em Next.js 14 com TypeScript e TailwindCSS que funcione perfeitamente em modo dark e light. Use os seguintes requisitos:

## Estrutura do Projeto
```
components/
├── Dashboard/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── MetricCard.tsx
│   ├── StatisticsChart.tsx
│   ├── FinancialChart.tsx
│   └── PerformanceChart.tsx
└── ui/
    ├── Button.tsx
    └── Card.tsx
```

## Especificações Técnicas

### 1. Layout Principal
- **Sidebar lateral esquerda** com ícones de navegação:
  - Home, Dashboard, Pacientes, Agenda, Financeiro, Relatórios, Configurações, Usuários, Documentos, Suporte
  - Logo "CLAIRIS" no topo
  - Ícones usando Lucide React
  - Background escuro (#0f172a slate-900)

### 2. Header Superior
- Saudação: "Boa noite, Dr Iallas Oliveira"
- Subtitle: "Você é o diferencial da sua clínica."
- Campo de busca: "Encontre pacientes ou funcionalidades do sistema"
- Seletor de período no canto direito
- Avatar do usuário
- Suporte a tema dark/light

### 3. Cards de Métricas (4 cards principais)
**Card Verde - Agendados:**
- Número: 0
- Label: "para hoje"
- Ícone: Calendar
- Cor: Verde (#22c55e)

**Card Azul - Atendidos:**
- Número: 0  
- Label: "para hoje"
- Ícone: CheckCircle
- Cor: Azul (#3b82f6)

**Card Vermelho - Desmarcados:**
- Número: 0
- Label: "para hoje" 
- Ícone: XCircle
- Cor: Vermelho (#ef4444)

**Card Azul Claro - Aniversariantes:**
- Número: 0
- Label: "para hoje"
- Ícone: Gift
- Cor: Azul claro (#06b6d4)

### 4. Gráfico de Estatísticas de Orçamentos
- **Título:** "Estatísticas de Orçamentos"
- **Subtitle:** "Número total de orçamentos"
- Gráfico de linha combinado com barras
- Eixo X: Jan, Fev, Mar, Abr, Mai, Jun, Jul, Ago, Set, Out, Nov, Dez
- Duas séries: "Total" (barras laranja) e "Abertos" (linha azul)
- Pico em Maio (~4.0)
- Use Recharts para implementar

### 5. Gráfico Circular Financeiro
- **Título:** "Total Financeiro"
- **Subtitle:** "Total de receitas e despesas"
- Gráfico donut verde
- Centro com "••••" e "Total"
- Legenda: Receita (verde), Despesa (laranja)

### 6. Gráfico de Performance
- **Título:** "Performance"
- Gráfico de área com duas séries:
  - "Receita" (laranja)
  - "A receber" (azul)
- Eixos: Jul, Ago, Set, Out, Nov, Dez

### 7. Cards Inferiores

**Card "Fechamento da semana":**
- Linhas: Aprovados, Reprovados
- Valores ocultos com "••••"

**Card "Analytics dos fechamentos":**
- Lista: Andamento, Fechado, Aberto, Perdido
- Escala de 0.0 a 2.0

### 8. Novidade em Destaque
Banner verde com:
- "Chegou novidade na Clairis!"
- "A inteligência artificial mais completa para clínicas!"
- Gerencia: Agendamentos (40), Financeiro (40), CRC (35), Chat CRM (37)

## Requisitos Técnicos

### Dependências necessárias:
```bash
npm install lucide-react recharts clsx tailwind-merge
npm install -D @types/node
```

### Theme Provider Setup:
- Configure next-themes para dark/light mode
- Use `dark:` prefixes no TailwindCSS
- Cores automáticas baseadas no sistema

### Cores principais:
- **Verde:** `emerald-500`
- **Azul:** `blue-500`  
- **Vermelho:** `red-500`
- **Azul claro:** `cyan-500`
- **Laranja:** `orange-500`
- **Background dark:** `slate-900`
- **Background light:** `gray-50`

### Responsividade:
- Mobile-first approach
- Sidebar colapsável em telas pequenas
- Grid responsivo para os cards
- Gráficos adaptáveis

### Funcionalidades:
1. **Toggle dark/light mode** no header
2. **Sidebar responsiva** com collapse
3. **Gráficos interativos** com tooltips
4. **Cards com hover effects**
5. **Animações suaves** com Tailwind transitions
6. **Typography hierárquica** clara

## Estrutura de Dados Mock
Crie dados mock realistas para:
- Métricas diárias (agendados, atendidos, etc.)
- Dados mensais para gráficos
- Performance financeira
- Lista de atividades

## Instruções Específicas:
1. Use TypeScript com interfaces bem definidas
2. Componentes modulares e reutilizáveis  
3. Implement loading states para gráficos
4. Error boundaries onde necessário
5. Otimize performance com useMemo/useCallback
6. Siga padrões de acessibilidade (WCAG)
7. Use Tailwind de forma semântica
8. Implemente lazy loading para componentes pesados

O resultado deve ser um dashboard profissional, moderno e totalmente funcional, idêntico ao design apresentado, com transições suaves entre temas dark e light.