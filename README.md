# TaskFlow — Application de gestion de projets collaboratifs

## Stack technique
- **Frontend** : HTML, CSS, JavaScript vanilla + Axios
- **Backend** : Node.js + Express
- **Base de données** : MongoDB (via Docker)
- **Auth** : JWT + bcryptjs
- **Infrastructure** : Docker Compose

## Lancer le projet

### 1. Cloner le dépôt et configurer l'environnement
```bash
git clone <URL_DU_REPO>
cd taskflow
cp .env.example .env
# Modifiez .env si nécessaire
```

### 2. Démarrer l'application (une seule commande)
```bash
docker-compose up --build
```

- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:5000/api

## Fonctionnalités implémentées

| # | Fonctionnalité | Branche |
|---|---|---|
| 1 | Authentification (JWT, bcrypt) | `feature/authentification` |
| 2 | Gestion des projets (CRUD + pagination + cascade) | `feature/projets` |
| 3 | Gestion des tâches (CRUD + statuts + priorités) | `feature/taches` |
| 4 | Assignation des tâches | `feature/assignation` |
| 5 | Tableau de bord (agrégation MongoDB) | `feature/dashboard` |
| 6 | Filtrage, recherche, pagination | `feature/filtrage` |
| 7 | Sauvegarde automatique des brouillons | `feature/brouillons` |
| 8 | Gestion des membres | `feature/membres` |
| 9 | Historique des activités | `feature/activites` |
| 10 | Notifications + polling | `feature/notifications` |

## Architecture du projet

```
taskflow/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── server.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── Task.js
│   │   ├── Activity.js
│   │   └── Notification.js
│   └── routes/
│       ├── auth.js
│       ├── projects.js
│       ├── tasks.js
│       ├── dashboard.js
│       └── notifications.js
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

## Workflow Git

```bash
# Travailler sur une fonctionnalité
git checkout develop
git checkout -b feature/ma-fonctionnalite

# Commits (convention Conventional Commits)
git commit -m "feat: add user schema with bcrypt password hashing"
git commit -m "feat: implement JWT login route"
git commit -m "feat: add authentication middleware"

# Pull Request vers develop quand c'est terminé
```

## Répartition des tâches

| Membre | Fonctionnalité(s) |
|--------|-------------------|
| Mohamed El Bakkali | Auth + Projets + Tâches + Dashboard |
| Yahya El Gharsi | Membres + Filtrage + Notifications + Frontend |
