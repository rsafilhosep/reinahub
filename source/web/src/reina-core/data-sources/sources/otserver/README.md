# OTServer Source Notes

Arquivos locais em `files_repository` sao biblioteca bruta.

Regras:

- ler como texto/XML/binario quando seguro;
- nunca executar `.lua`, `.exe`, `.bat`, `.dll` ou scripts;
- gerar relatorios antes de importar;
- promover dados somente apos validacao.
