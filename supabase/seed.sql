with templates(slug, base_name, product_type, category, base_price, maker, maker_location, material, color, image, image_position, description, moods) as (
  values
  ('cana-luna','Cană Luna','Cană','Ceramică',119,'Atelier Lut Bun','Cluj-Napoca','ceramică glazurată','crem și albastru','/products/catalog/cana-luna.webp','center','Cană modelată și pictată manual, cu glazură alimentară și variații naturale.',array['cald','poetic','minimalist']),
  ('ceasca-zori','Ceașcă Zori','Ceașcă','Ceramică',99,'Atelier Lut Bun','Cluj-Napoca','ceramică glazurată','crem și verde','/products/catalog/ceasca-zori.webp','center','Ceașcă fină pentru cafea sau ceai, arsă în loturi mici.',array['delicat','natural','cald']),
  ('vaza-pamant','Vază Pământ','Vază','Ceramică',189,'Forma Vie','Timișoara','gresie ceramică','nisipiu și teracotă','/products/catalog/vaza-pamant.webp','center','Vază sculpturală construită manual și finisată cu o glazură minerală.',array['organic','elegant','minimalist']),
  ('vaza-indigo','Vază Indigo','Vază','Ceramică',219,'Forma Vie','Timișoara','ceramică glazurată','albastru și crem','/products/catalog/vaza-indigo.webp','center','Vază înaltă cu desen cobalt aplicat liber înainte de arderea finală.',array['elegant','poetic','modern']),
  ('bol-nisip','Bol Nisip','Bol','Ceramică',109,'Ceramică de Acasă','Iași','gresie ceramică','nisipiu','/products/catalog/bol-nisip.webp','center','Bol utilitar cu margine vie și interior glazurat manual.',array['natural','practic','minimalist']),
  ('farfurie-floare','Farfurie Floare','Farfurie','Ceramică',129,'Ceramică de Acasă','Iași','ceramică glazurată','crem și verde','/products/catalog/farfurie-floare.webp','center','Farfurie decorativă cu motive botanice pictate manual.',array['botanic','delicat','colorat']),
  ('pahar-prisma','Pahar Prismă','Pahar','Sticlărie',89,'Sticlă Vie','Buzău','sticlă reciclată','albastru marin','/products/catalog/pahar-prisma.webp','center','Pahar suflat manual, cu bule fine și o bază stabilă.',array['modern','elegant','colorat']),
  ('set-pahare-rau','Set de pahare Râu','Set de pahare','Sticlărie',179,'Sticlă Vie','Buzău','sticlă reciclată','verde și transparent','/products/catalog/set-pahare-rau.webp','center','Set de două pahare suflate manual, fiecare cu o formă ușor diferită.',array['natural','modern','elegant']),
  ('pahar-onda','Pahar Ondă','Pahar','Sticlărie',79,'Lumina Sticlei','Mediaș','sticlă reciclată','chihlimbar','/products/catalog/pahar-onda.webp','center','Pahar cu relief ondulat și nuanță caldă obținută în masa sticlei.',array['cald','modern','practic']),
  ('broderie-ierbar','Ierbar de câmp','Broderie','Textile',149,'Mâini de In','Brașov','in și fir de bumbac','ocru și verde','/products/catalog/broderie-ierbar.webp','center','Flori de câmp brodate fir cu fir pe pânză de in.',array['botanic','cald','boem']),
  ('perna-apus','Pernă Apus','Pernă','Textile',169,'Țesături Domol','Oradea','in și bumbac','roz și teracotă','/products/catalog/perna-apus.webp','center','Pernă decorativă țesută în lot mic, cu husă detașabilă.',array['cozy','colorat','modern']),
  ('patura-molid','Pătură Molid','Pătură','Textile',289,'Țesături Domol','Oradea','bumbac reciclat','verde și crem','/products/catalog/patura-molid.webp','center','Pătură moale cu desen geometric inspirat de pădurile de munte.',array['cozy','natural','cald']),
  ('lumanare-chihlimbar','Lumânare Chihlimbar','Lumânare','Lumânări',79,'Foc Domol','Sibiu','ceară de soia','chihlimbar și crem','/products/catalog/lumanare-chihlimbar.webp','center','Lumânare turnată manual, cu parfum discret de smochină și cedru.',array['cald','relaxant','cozy']),
  ('lumanare-smochin','Lumânare Smochin','Lumânare','Lumânări',89,'Foc Domol','Sibiu','ceară de soia','verde și crem','/products/catalog/lumanare-smochin.webp','center','Lumânare vegetală maturată șapte zile pentru o ardere uniformă.',array['relaxant','natural','elegant']),
  ('suport-arc','Suport Arc','Suport de lumânare','Lumânări',119,'Forme Mici','București','alamă patinată','auriu','/products/catalog/suport-arc.webp','center','Suport de lumânare format și finisat manual din alamă.',array['elegant','modern','cald']),
  ('colier-roua','Colier Rouă','Colier','Bijuterii',199,'Atelier Mărunt','București','argint','argintiu','/products/catalog/colier-roua.webp','center','Colier minimalist lucrat manual din argint reciclat.',array['delicat','elegant','minimalist']),
  ('cercei-frunza','Cercei Frunză','Cercei','Bijuterii',159,'Atelier Mărunt','București','alamă','auriu și verde','/products/catalog/cercei-frunza.webp','center','Cercei ușori, decupați și patinați manual.',array['botanic','delicat','elegant']),
  ('bratara-fir','Brățară Fir','Brățară','Bijuterii',139,'Punct și Linie','Cluj-Napoca','argint și fir textil','argintiu și albastru','/products/catalog/bratara-fir.webp','center','Brățară reglabilă, asamblată manual din argint și fir cerat.',array['modern','delicat','colorat']),
  ('cutie-nuc','Cutie Nuc','Cutie','Lemn',179,'Lemn cu Rost','Maramureș','lemn de nuc','nuc închis','/products/catalog/cutie-nuc.webp','center','Cutie sculptată și ceruită manual, potrivită pentru obiecte mici.',array['rustic','elegant','practic']),
  ('tava-nord','Tavă Nord','Tavă','Lemn',169,'Lemn cu Rost','Maramureș','lemn de nuc','nuc și crem','/products/catalog/tava-nord.webp','center','Tavă din lemn masiv cu margini rotunjite și finisaj alimentar.',array['natural','practic','minimalist']),
  ('rama-feriga','Ramă Ferigă','Ramă','Decorațiuni',149,'Casa Mică','Brașov','lemn de stejar','natur și verde','/products/catalog/rama-feriga.webp','center','Ramă finisată manual, cu inserție botanică presată.',array['botanic','natural','poetic']),
  ('decor-luna','Decorațiune Lună','Decorațiune','Decorațiuni',129,'Casa Mică','Brașov','compozit mineral','crem și albastru','/products/catalog/decor-luna.webp','center','Obiect decorativ turnat și șlefuit manual în formă de semilună.',array['poetic','modern','minimalist']),
  ('jurnal-herbarium','Jurnal Herbarium','Jurnal','Papetărie',89,'Hârtie Vie','Iași','hârtie reciclată','verde și natur','/products/catalog/jurnal-herbarium.webp','center','Jurnal legat manual, cu hârtie reciclată și copertă textilă.',array['botanic','practic','boem']),
  ('semn-tei','Semn de carte Tei','Semn de carte','Papetărie',39,'Hârtie Vie','Iași','hârtie reciclată','ocru și verde','/products/catalog/semn-tei.webp','center','Semn de carte presat și tipărit manual cu frunză de tei.',array['poetic','delicat','natural'])
), editions as (select templates.*, series from templates cross join generate_series(1,30) as series)
insert into public.products (
  id, name, product_type, category, price, old_price, stock, maker, maker_location, material, color,
  occasion, recipients, moods, image, image_position, rating, reviews, shipping_days, badge,
  description, details, care, story, active, created_at, updated_at
)
select
  slug || '-' || lpad(series::text, 3, '0'), base_name || ' · Ediția ' || lpad(series::text, 2, '0'),
  product_type, category, base_price + (series % 5) * 5,
  case when series % 7 = 0 then base_price + 35 else null end,
  2 + ((series * 7 + base_price) % 19), maker, maker_location, material, color,
  case series % 4 when 0 then array['cadou','aniversare'] when 1 then array['casă nouă','cadou'] when 2 then array['mulțumire','cadou'] else array['nuntă','cadou'] end,
  case series % 6 when 0 then array['prietenă','soră'] when 1 then array['mamă','iubitor de plante'] when 2 then array['cuplu','gazdă'] when 3 then array['colegă','prieten'] when 4 then array['tată','frate'] else array['iubitor de cafea','iubitor de ceai'] end,
  moods, image, image_position, round((4.5 + (series % 5) * 0.1)::numeric, 1),
  8 + ((series * 13 + base_price) % 91), 1 + (series % 4),
  case when series % 11 = 0 then 'Serie mică' when series % 9 = 0 then 'Nou' when series % 7 = 0 then 'Ofertă' else null end,
  description, array['realizat manual','serie numerotată','ambalaj fără plastic','produs în România'],
  'Curăță delicat și păstrează produsul departe de șocuri, umezeală excesivă și soare direct.',
  'Fiecare exemplar trece prin mâna artizanului, iar micile variații de formă și culoare îi confirmă caracterul unic.',
  true, now() - (series || ' days')::interval, now()
from editions
on conflict (id) do update set
  name = excluded.name, product_type = excluded.product_type, category = excluded.category, price = excluded.price,
  old_price = excluded.old_price, stock = excluded.stock, maker = excluded.maker, maker_location = excluded.maker_location,
  material = excluded.material, color = excluded.color, occasion = excluded.occasion, recipients = excluded.recipients,
  moods = excluded.moods, image = excluded.image, image_position = excluded.image_position, rating = excluded.rating,
  reviews = excluded.reviews, shipping_days = excluded.shipping_days, badge = excluded.badge, description = excluded.description,
  details = excluded.details, care = excluded.care, story = excluded.story, active = true, updated_at = now();
