# Auto-PR on Project Status Change
## Workflow de GitHub Actions para crear Pull Requests automáticos al mover Issues en GitHub Projects

Este workflow crea un **Pull Request automático** cuando un *Issue* es movido a las columnas **DEV** o **QA** dentro de un **GitHub Project (Projects v2)**.

---

# 1. Información General del Workflow

**Nombre del workflow:**  
`Auto-PR on Project Status Change`

**Funcionalidad principal:**  
Cuando una tarjeta del Project cambia de columna (Status), el workflow detecta el cambio y:

1. Obtiene los datos del Issue  
2. Verifica si tiene etiqueta **BE** o **FE**  
3. Determina en qué repositorio crear el PR  
4. Determina la rama base según la columna:  
   - DEV → `develop`  
   - QA → `release`  
5. Crea el Pull Request automáticamente

---

# 2. Evento que dispara el Workflow

El workflow se ejecuta cuando un item de Projects v2 es editado:

```yaml
on:
  projects_v2_item:
    types: [edited]
```

---

# 3. Condición del Job

Verifica que existan cambios detectables:

```yaml
if: github.event.changes
```

---

# 4. Código Completo del Workflow

```yaml
name: Auto-PR on Project Status Change

on:
  projects_v2_item:
    types: [edited]

jobs:
  check_column_and_create_pr:
    runs-on: ubuntu-latest
    
    if: github.event.changes 
      
    steps:
      - name:  Get Issue Details, Calculate Branch, and Create PR
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GH_PAT }} 
          script: |
            const owner = 'JulioQes';
            
            // 1. Verify if the change was in the 'Status' field.
            if (!context.payload.changes || 
                !context.payload.changes.field_value || 
                !context.payload.changes.field_value.field_value || 
                context.payload.changes.field_value.field_value.field.name !== 'Status') {
                console.log('Change was not a status field change or structure is unexpected. Skipping PR creation.');
                return;
            }
            
            const targetStatus = context.payload.changes.field_value.field_value.field_value.name; // 'DEV' or 'QA'
            
            if (targetStatus !== 'DEV' && targetStatus !== 'QA') {
                console.log(`Target status is ${targetStatus}, not DEV or QA. Skipping PR creation.`);
                return;
            }

            // --- 1. EXTRACT DATA FROM PROJECT EVENT ---
            const issueNumber = context.payload.changes.field_value.field_value.field_value.issue.number;
            const issueRepo = context.payload.changes.field_value.field_value.field_value.issue.repository.name;
            const sourceIssueRepoOwner = context.payload.changes.field_value.field_value.field_value.issue.repository.owner.login;

            // --- 2. FETCH ISSUE DETAILS ---
            const { data: issue } = await github.rest.issues.get({
                owner: sourceIssueRepoOwner,
                repo: issueRepo,
                issue_number: issueNumber,
            });

            const labels = issue.labels.map(label => label.name);
            let targetCodeRepo = '';
            let branchPrefix = '';
            
            // Determine the code repository based on labels
            if (labels.includes('BE')) {
                targetCodeRepo = 'POC-LAUREATE-BOARD-BE';
                branchPrefix = 'be/';
            } else if (labels.includes('FE')) {
                targetCodeRepo = 'POC-LAUREATE-BOARD-FE';
                branchPrefix = 'fe/';
            } else {
                console.log('Issue moved but missing BE/FE label. Skipping PR creation.');
                return;
            }

            // --- 3. CALCULATE BRANCH NAMES AND PR TARGET ---
            const prTitle = issue.title;
            const cleanTitle = issue.title.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-*|-*$/g, '')
              .substring(0, 30);

            const featureBranch = `${branchPrefix}issue-${issueNumber}-${cleanTitle}`; // Head (source branch)
            
            // Target base branch depending on project status
            const baseBranch = (targetStatus === 'DEV') ? 'develop' : 'release';
            
            const dynamicPRTitle = `[${targetStatus} Merge]: ${prTitle}`;

            // --- 4. CREATE THE PULL REQUEST ---
            console.log(`Creating PR for Issue #${issueNumber} in ${targetCodeRepo}, from ${featureBranch} to ${baseBranch}.`);

            try {
                const { data: prData } = await github.rest.pulls.create({
                    owner: owner,
                    repo: targetCodeRepo, 
                    title: dynamicPRTitle,
                    head: featureBranch,  
                    base: baseBranch,     
                    body: `PR created automatically because the issue was moved to the **${targetStatus}** column.\n\nCloses #${issueNumber}`,
                    draft: false, 
                });

                // 5. Comment on the original Issue
                await github.rest.issues.createComment({
                    issue_number: issueNumber,
                    owner: sourceIssueRepoOwner,
                    repo: issueRepo,
                    body: `**Pull Request created** in the repository \`${targetCodeRepo}\` because the issue was moved to **${targetStatus}**.
                    
                    The pull request merges from branch \`${featureBranch}\` into branch \`${baseBranch}\`.                    
                    [View Pull Request](${prData.html_url})`
                });

            } catch (error) {
                // If missing branch or PR creation fails
                core.setFailed(`PR creation failed when moving to ${targetStatus}. Error: ${error.message}`);
                await github.rest.issues.createComment({
                    issue_number: issueNumber,
                    owner: sourceIssueRepoOwner,
                    repo: issueRepo,
                    body: `**Failed to create the Pull Request** when moving to **${targetStatus}**.
                    **Reason:** ${error.message}.

                    **Checklist:** Please ensure that:
                    1. The branch \`${featureBranch}\` exists in the code repository.
                    2. The branch \`${baseBranch}\` exists in the code repository.
                    3. There are commits in \`${featureBranch}\` that are not in \`${baseBranch}\`.`
                });
            }
```

---

# 5. Flujo del Sistema

1. El usuario mueve un Issue a la columna **DEV** o **QA**.  
2. GitHub Projects envía el evento *edited*.  
3. El workflow detecta el cambio en el campo **Status**.  
4. Se obtiene el Issue original y sus etiquetas BE/FE.  
5. Se decide el repositorio destino.  
6. Se calcula la rama de feature.  
7. Se abre un Pull Request hacia:
   - `develop` si va a DEV  
   - `release` si va a QA  
8. Se notifica en el Issue.

---

# 6. Requisitos

- Token PAT con permisos completos guardado en:  
  ```
  GH_PAT
  ```
- Repositorios:
  - `POC-LAUREATE-BOARD-BE`
  - `POC-LAUREATE-BOARD-FE`
- Issues con etiquetas correctas (`BE` o `FE`)
- Ramas base existentes:
  - `develop`
  - `release`

---

# 7. Beneficios

- Automatiza la generación de PR.  
- Sincroniza Projects → Código.  
- Evita errores humanos en branches y PR targets.  
- Mantiene un flujo limpio entre DEV y QA.

---
