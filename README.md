# TDTU Locket - Simple Node server

This small server provides:

- POST /login - provide a password (no account) to receive a JWT
- POST /links - protected route to save a link together with the password
- GET /links - public route that lists saved links (no password returned)

Password format (8 chars):
- 1st: letter (A-Z or a-z)
- 2nd+3rd: one of 25,24,23,22,21
- 4th: letter (A-Z or a-z)
- last 4: digits (0-9)

Example valid passwords: A25b1234, z22Z0001

Quick start (PowerShell):

```powershell
cd 'C:\coding\project\tdtu locket\BE'
npm install
copy .env.example .env
# edit .env to set MONGODB_URI and JWT_SECRET if needed
npm start
```

Examples (using curl):

1) Login to get token

```powershell
curl -Method POST -Uri http://localhost:3000/login -ContentType 'application/json' -Body '{"password":"A25b1234"}'
```

2) Save a link (replace TOKEN with returned token)

```powershell
curl -Method POST -Uri http://localhost:3000/links -Headers @{ Authorization = "Bearer TOKEN" } -ContentType 'application/json' -Body '{"password":"A25b1234","link":"https://example.com"}'
```

3) List links

```powershell
curl http://localhost:3000/links
```
