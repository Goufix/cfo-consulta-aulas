# CFO Consulta de Aulas

Frontend estatico para consultar aulas realizadas por aluno no Firestore.

## Arquivos

- `index.html`: estrutura da pagina.
- `styles.css`: identidade visual e responsividade.
- `app.js`: inicializacao Firebase e consulta Firestore.

## Configuracao obrigatoria

Substituir em `app.js` o objeto `firebaseConfig` pelo config Web App do Firebase.

Este config vem do Firebase Console em:

`Project settings > General > Your apps > Web app > SDK setup and configuration`

Nao use service account no frontend.

## Placeholders obrigatorios de imagem

Substituir no `index.html` e `app.js`:

- `https://PLACEHOLDER_CDN_URL/cfo-brasao.png`
- `https://PLACEHOLDER_CDN_URL/current-user-avatar.png`
- `https://PLACEHOLDER_CDN_URL/student-avatar-placeholder.png`
- `https://PLACEHOLDER_CDN_URL/student-avatar-{studentKey}.png`
- `https://PLACEHOLDER_BACKUP_URL`

## Firestore

Collections esperadas:

`classAttendances`

`evaluations`

Campos usados pela pagina em `classAttendances`:

- `class`: string
- `classDate`: timestamp
- `studentKey`: string
- `professor`: string

Campos usados pela pagina em `evaluations`:

- `evaluationDate`: timestamp
- `evaluatedKey`: string
- `evaluator`: string
- `result`: string
- `resultKey`: string

Queries usadas:

```js
where('studentKey', '==', studentKey)
orderBy('classDate', 'desc')
limit(200)

where('evaluatedKey', '==', studentKey)
orderBy('evaluationDate', 'desc')
limit(200)
```

Se o Firestore solicitar indice composto, crie pelo link exibido no erro do console.

## Rules

Para uma pagina publica de consulta, publique regras permitindo apenas leitura das collections `classAttendances` e `evaluations`.

Exemplo em `firestore.rules`:

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /classAttendances/{attendanceId} {
      allow read: if true;
      allow create, update, delete: if false;
    }

    match /evaluations/{evaluationId} {
      allow read: if true;
      allow create, update, delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Essas regras deixam a busca publica, mas impedem alteracao dos dados pelo frontend.

## Uso em custom page

O `index.html` usa:

```html
<script type="module" src="./app.js"></script>
```

Se o forum nao aceitar `type="module"`, sera necessario gerar um bundle ou alterar a estrategia de carregamento.
