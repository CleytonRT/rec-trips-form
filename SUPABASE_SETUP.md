# Integracao Supabase - Cadastro RecTrips

Este site agora tenta salvar o cadastro em:

`/.netlify/functions/register-passenger`

O cadastro agora salva somente pelo Supabase via Netlify Function. Se a Function nao estiver configurada ou falhar, o envio mostra erro e nao grava em fonte antiga.

## Variaveis no Netlify

No site `cadastro.rectrips.com.br`, acesse:

`Netlify > Site configuration > Environment variables`

Crie estas variaveis:

```txt
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_JWKS_URL=
```

Use os valores do Supabase em:

`Supabase > Dados Passageiros > Connect`

Nunca coloque `SUPABASE_SECRET_KEY` em arquivo do site, GitHub ou JavaScript publico.

## Deploy

Depois de configurar as variaveis:

1. Faça commit dos arquivos alterados.
2. Faça push para o GitHub.
3. Aguarde o deploy do Netlify.
4. Abra o site de cadastro publicado.
5. Faça um cadastro teste.
6. Confira no Supabase:
   - `trips`
   - `passengers`
   - `trip_passengers`

## Comportamento esperado

- `passengers` guarda o passageiro uma unica vez.
- `trip_passengers` vincula o passageiro na viagem.
- A regra de crianca de colo e recalculada no banco pela data de nascimento e data da viagem.
- Se a Function falhar, o cadastro mostra erro e nao grava em fonte antiga.

## Observacao de seguranca

Como a chave secreta foi compartilhada durante a configuracao, recomendo regenerar a `SUPABASE_SECRET_KEY` no Supabase depois que o deploy estiver funcionando.
