# Cross-Repo Branch Dispatcher (BE/FE)
## Workflow de GitHub Actions para creación automática de ramas

Este documento describe el funcionamiento del workflow que crea ramas automáticamente en los repositorios **Back-End (BE)** y **Front-End (FE)** cuando un *Issue* recibe una etiqueta específica.

---

# 1. Información General

**Nombre del workflow:**  
`Cross-Repo Branch Dispatcher (BE/FE)`

**Funcionalidad principal:**  
Cuando un Issue recibe la etiqueta `BE` o `FE`, el workflow crea automáticamente una nueva rama en el repositorio correspondiente:

- `POC-LAUREATE-BOARD-BE`  → etiqueta **BE**  
- `POC-LAUREATE-BOARD-FE`  → etiqueta **FE**

Luego, deja un comentario en el Issue indicando la rama creada.

---

# 2. Evento que dispara el Workflow

El workflow se ejecuta cuando un Issue recibe una nueva etiqueta:

```yaml
on:
  issues:
    types: [labeled]
```

---

# 3. Condición para Ejecutar el Job

El workflow solo continúa si el Issue tiene alguna de estas etiquetas:

- `BE`
- `FE`

```yaml
if: |
  contains(toJson(github.event.issue.labels.*.name), 'BE') ||
  contains(toJson(github.event.issue.labels.*.name), 'FE')
```

---

# 4. Lógica General del Job

El job corre en Ubuntu:

```yaml
runs-on: ubuntu-latest
```

Y ejecuta un script en `github-script` usando un `GH_PAT` con permisos de escritura para crear ramas en otros repos.

---

# 5. Código Completo del Workflow

```yaml
name: Cross-Repo Branch Dispatcher (BE/FE)

on:
  issues:
    types: [labeled]

jobs:
  create_cross_repo_branch:
    runs-on: ubuntu-latest
    
    if: |
      contains(toJson(github.event.issue.labels.*.name), 'BE') ||
      contains(toJson(github.event.issue.labels.*.name), 'FE')

    steps:
      - name: Create Branch in Target Repo
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GH_PAT }} 
          script: |
            const owner = 'JulioQes';
            const baseBranch = 'main'; // Target base branch

            // 1. Identify labels and define the target repository
            const labels = context.payload.issue.labels.map(label => label.name);
            let targetRepo = '';
            let branchPrefix = '';
            
            if (labels.includes('BE')) {
                targetRepo = 'POC-LAUREATE-BOARD-BE';
                branchPrefix = 'be/';
            } else if (labels.includes('FE')) {
                targetRepo = 'POC-LAUREATE-BOARD-FE';
                branchPrefix = 'fe/';
            } else {
                console.log('No target label (BE or FE) found. Skipping branch creation.');
                return;
            }

            // 2. Format the branch name
            const issueNumber = context.payload.issue.number;
            const issueTitle = context.payload.issue.title.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-*|-*$/g, '')
              .substring(0, 30);
            const newBranchName = `${branchPrefix}issue-${issueNumber}-${issueTitle}`;
            
            // 3. Get the SHA of the base branch
            console.log(`Fetching SHA for ${baseBranch} in ${targetRepo}`);
            try {
                const { data: refData } = await github.rest.git.getRef({
                    owner: owner,
                    repo: targetRepo,
                    ref: `heads/${baseBranch}`,
                });
                const sha = refData.object.sha;
                
                // 4. Create the new branch
                console.log(`Creating branch ${newBranchName} in ${targetRepo} with SHA ${sha}`);
                await github.rest.git.createRef({
                    owner: owner,
                    repo: targetRepo,
                    ref: `refs/heads/${newBranchName}`,
                    sha: sha,
                });

                // 5. Comment on the original Issue
                await github.rest.issues.createComment({
                    issue_number: context.issue.number,
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    body: ` **Branch created automatically!**
                    
                    - **Code Repository:** \`${owner}/${targetRepo}\`
                    - **Branch Created:** \`${newBranchName}\`
                    
                    The Team can now start to work and make **commits** on this branch. Move this Issue to **DEV** when ready for the Pull Request.`
                });
            } catch (error) {
                core.setFailed(`Error creating branch in ${targetRepo}: ${error.message}`);
                await github.rest.issues.createComment({
                    issue_number: context.issue.number,
                    owner: context.repo.owner,
                    repo: context.repo.repo,
                    body: ` **Error creating automatic branch in ${targetRepo}**

                    **Error:** ${error.message}`
                });
            }
```

---

# 6. Flujo de Trabajo (Resumen)

1. Se etiqueta el Issue con `BE` o `FE`.
2. El workflow se ejecuta automáticamente.
3. Se identifica el repositorio objetivo.
4. Se construye un nombre de rama estandarizado:
   ```
   be/issue-123-nombre-del-issue
   fe/issue-456-validar-login
   ```
5. Se crea la nueva rama en el repo correspondiente.
6. Se agrega un comentario en el Issue con la información.

---

# 7. Requisitos para que funcione

- Un **token PAT** guardado como:  
  ```
  GH_PAT
  ```
  con permisos `repo` y `workflow`.

- Repositorios destino:
  - `POC-LAUREATE-BOARD-BE`
  - `POC-LAUREATE-BOARD-FE`

- Issues deben tener etiquetas correctas (`BE` o `FE`).

---

# 8. Beneficios del Sistema

- Estandariza el nombre de las ramas.  
- Evita que los dev creen ramas erróneas.  
- Automatiza el flujo BE/FE desde un solo Issue.  
- Facilita la trazabilidad entre Issue → Rama → PR.

---
