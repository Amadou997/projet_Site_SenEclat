# Sen Éclat — site e-commerce

Beauté · Cosmétiques · Lessive · Nettoyage — *le savoir-faire espagnol au Sénégal*.

| Couche | Technologies |
|---|---|
| Backend | Python 3.12+, Django 6, Django REST Framework, SimpleJWT (+ liste noire), django-filter, django-cors-headers, Argon2 |
| Frontend | React 19, TypeScript (strict), Vite, React Router 7, Motion (animations) |

## Démarrage rapide

### 1. API (Django)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows (source .venv/bin/activate sous macOS/Linux)
pip install -r requirements-dev.txt
copy .env.example .env            # puis renseigner DJANGO_SECRET_KEY et SEED_ADMIN_PASSWORD
python manage.py migrate
python manage.py seed             # 16 produits de démo, code ECLAT10, compte admin
python manage.py runserver
```

- API : http://127.0.0.1:8000/api/
- Back-office (catalogue, stocks, commandes, codes promo, messages) : http://127.0.0.1:8000/admin/

### 2. Site (React)

```bash
cd frontend
npm install
npm run dev
```

Site : http://localhost:5173. Vite relaie `/api` vers Django : navigateur et API partagent la même origine, le cookie de session fonctionne donc sans configuration CORS.

### Qualité

```bash
cd backend && pytest                 # 16 tests : auth JWT, catalogue, commandes, sécurité
cd frontend && npm run typecheck && npm run lint && npm run build
```

## Sécurité — JWT

| Jeton | Durée | Stockage | Transport |
|---|---|---|---|
| Access | 15 min | **mémoire JS uniquement** (jamais localStorage) | `Authorization: Bearer …` |
| Refresh | 7 j | **cookie `HttpOnly`, `SameSite=Strict`, `Secure` en prod**, limité à `/api/auth/` | automatique |

- **Rotation** : chaque `/api/auth/refresh/` émet un nouveau refresh et met l'ancien en liste noire.
- **Détection de vol** : rejouer un refresh déjà utilisé révoque *toutes* les sessions de l'utilisateur.
- **CSRF** : en plus de `SameSite=Strict`, les routes qui lisent le cookie exigent l'en-tête `X-Requested-With`.
- Les JWT portent `aud` / `iss` (vérifiés) ; l'algorithme est fixé (HS256), ce qui bloque `alg=none`.
- Rafraîchissement silencieux côté front : au chargement, avant expiration, et une seule fois sur un 401 (requêtes concurrentes regroupées).
- Mots de passe hachés en **Argon2**, validateurs Django ; même temps de réponse que le compte existe ou non.
- Limitation de débit : connexion / inscription 10/min, contact 5/h, commandes 20/h.
- En-têtes : `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, COOP ; HSTS et redirection HTTPS quand `DJANGO_DEBUG=false`.
- **Prix toujours recalculés côté serveur** (`/api/cart/quote/`, `/api/orders/`) ; décrément du stock atomique (`select_for_update` + `UPDATE … WHERE stock >= qty`).
- Commander nécessite un compte client (401 sinon ; le front redirige vers `/compte?next=/commande`). Une commande n'est lisible que par son propriétaire ou avec sa clé opaque (`X-Order-Key`) ; sinon 404, pour ne pas révéler son existence.

## API

| Méthode | Route | Accès |
|---|---|---|
| POST | `/api/auth/register/` · `/login/` · `/refresh/` · `/logout/` | public |
| GET/PATCH | `/api/auth/me/` | connecté |
| GET | `/api/products/?category=&q=&min_price=&max_price=&in_stock=&promo=&new=&sort=&page=` | public |
| GET | `/api/products/<slug>/` · `/api/products/<slug>/related/` | public |
| GET | `/api/store/config/` (frais, zones desservies) | public |
| POST | `/api/cart/quote/` | public |
| POST / GET | `/api/orders/` (commander / mes commandes) | connecté |
| GET | `/api/orders/<numéro>/` | propriétaire ou `X-Order-Key` |
| POST | `/api/contact/` | public |

## Animations

Toutes respectent `prefers-reduced-motion` (`MotionConfig reducedMotion="user"` + CSS).

- **Ouverture de marque** (une fois par session) : les 4 univers du logo convergent en trèfle, une étoile scintille, le logotype se dévoile, puis le rideau se lève.
- **Héros** : titre révélé mot par mot, reflet or animé, trèfle en parallaxe au pointeur, anneaux en rotation, étoiles scintillantes.
- **Transitions de page** : voile prune traversé d'un fil d'or.
- **Ajout au panier** : une étincelle dorée vole jusqu'à l'icône du panier, le badge rebondit, une notification apparaît.
- **Cartes produit** : inclinaison 3D qui suit le pointeur, reflet lumineux, médaillon qui flotte.
- Pastille de filtre qui glisse (layout partagé), grille qui se réorganise, totaux qui défilent, quantités qui roulent, champs invalides qui tremblent, coche de confirmation dessinée avec gerbe d'étoiles, barre de progression dorée, bandeau défilant, boutons « aimantés ».

## À fournir par Sen Éclat

Les éléments entre crochets dans l'interface (ex. *[à confirmer]*) reprennent les espaces réservés de la maquette : adresse et horaires de la boutique, délais de livraison, photos produits officielles (champ `image_url`), textes légaux. Le numéro WhatsApp (+221 77 989 35 35) est défini dans `frontend/src/config.ts` et peut être remplacé via `VITE_WHATSAPP_NUMBER`.

Les paiements Wave, Orange Money et carte passent par une **passerelle simulée** (`backend/apps/orders/payments.py`). Pour la production, implémenter `PaymentGateway` avec le prestataire retenu et confirmer les paiements via un webhook signé.
