Full FAQ: [FAQ](https://developer-ru.github.io/Dynamic-API-Platform/faq/)

**Q: Can I use GET and POST on same path?**  
Yes, data is shared via `resourcePath`.

**Q: Can I link records between endpoints?**  
Yes. Use schema type **`reference`**, pick the target endpoint, pass a record `id`. Use `?populate=` on GET.

**Q: Do I need to restart the server for new endpoints?**  
No. Routes are loaded from MongoDB on each request.

**Q: Can I delete system endpoints?**  
No, they are protected.

**Q: Test on `/api/users` returns Forbidden?**  
Update to the latest backend — the tester now uses the real management API with RBAC.

**Q: Can I browse MongoDB in the UI?**  
Yes — **Database** page (`/database`), requires `manage_users`. See [Database Explorer](Database-Explorer).

**Q: Can I restrict endpoints by domain or IP?**  
Yes — **Network Access** on endpoint groups and endpoints. See [Network Access](Network-Access).

**Q: How to reset database?**  
`docker compose down -v && docker compose up -d`

**Q: License?**  
Apache License 2.0
