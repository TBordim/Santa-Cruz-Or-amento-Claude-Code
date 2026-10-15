// Modelos de fundo e de tampa de cartucho, como sugestões nos campos "Fechamento fundo" e
// "Fechamento tampa" da Solicitação. O campo continua aceitando texto livre: a lista só ajuda a
// padronizar o nome. Levantados na internet (Pack.ly, Packmage, Sttark, CCL Healthcare); os nomes em
// português são tradução e precisam ser conferidos pela Engenharia. Ainda não mudam a faca da
// Pré-montagem — cada modelo precisa de uma faca própria (ver src/lib/montagem/geometria.ts).

export const FECHAMENTOS_FUNDO = [
  "Fundo reto (lingueta)",
  "Fundo reverso (lingueta)",
  "Fundo 1-2-3 (snap lock)",
  "Fundo automático / americano (crash lock)",
  "Fundo automático de aba cheia",
  "Fundo selado (colado)",
  "Sem fundo (luva)",
] as const;

export const FECHAMENTOS_TAMPA = [
  "Tampa de lingueta reta",
  "Tampa de lingueta reversa",
  "Tampa com trava (slit-lock / friction fit)",
  "Tampa lacrada (inviolável)",
  "Tampa americana com cabide (hang tab)",
  "Sem tampa (luva)",
] as const;
