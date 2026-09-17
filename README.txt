MINISTÈRE OS — VERSION AVEC ACCÈS ET NOTIFICATIONS PERSONNELLES

Cette version ajoute une première gestion des rôles et de la confidentialité.

COMPTES DE DÉMONSTRATION
- Administrateur : admin / admin123
- Responsable financier : finance / finance123
- Serviteur Daniel : daniel / daniel123
- Serviteur Josué : josue / josue123

RÈGLES D’ACCÈS
- Administrateur : accès complet.
- Responsable financier : accès à la partie Contributions/Finances.
- Serviteur : pas d’accès à la partie financière.
- Les notifications de programmation et d’absence sont personnelles lorsqu’elles sont adressées à un serviteur précis.
- Les informations générales peuvent rester visibles par tous les utilisateurs connectés.

LANCEMENT
1. Décompresser le ZIP.
2. Ouvrir le dossier dans VS Code.
3. Ouvrir index.html avec Live Server.
4. Se connecter avec l’un des comptes de démonstration ci-dessus.

IMPORTANT — SÉCURITÉ
Cette version reste une version locale de démonstration : les données sont stockées dans le navigateur et les comptes sont définis dans JavaScript. Ce n’est PAS encore une sécurité réelle pour Internet.

Pour une publication réelle, il faudra remplacer ce système par :
- backend et API ;
- base de données ;
- authentification sécurisée côté serveur ;
- mots de passe hachés ;
- rôles et permissions côté serveur ;
- sessions sécurisées ;
- sauvegardes ;
- HTTPS ;
- protection des données personnelles.

STRUCTURE
- index.html : interface
- style.css : design
- script.js : logique et données locales
- README.txt : documentation

Projet Ministère OS — PDU Design


PROTECTION DES FINANCES
------------------------
La rubrique Contributions/Finances est réservée aux comptes ayant le rôle
Administrateur ou Responsable financier. Les autres profils ne voient pas
le menu Finance et l'accès direct à cette page est refusé.

COMPTES DE DÉMONSTRATION
Administrateur : admin / admin123
Responsable financier : finance / finance123

IMPORTANT : ces identifiants sont uniquement pour les tests locaux. Pour une
publication réelle, l'authentification doit être gérée par un backend et une
base de données sécurisés.
