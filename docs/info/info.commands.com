* run the server (on localhost):
     cd NUXT_TimeReward
     npm run dev

     //then
     http://localhost:3000/

* // run webhook on localhost  (may needL > stripe login, first)
     > stripe listen --forward-to localhost:3000/api/stripe/webhook