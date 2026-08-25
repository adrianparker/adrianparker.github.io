# Gig Venue Locations

Every unique Country / City / Venue combination from `gig-history.md`, with a Location value you can drop into Google Maps to place a pin.

Location is `latitude, longitude` in decimal degrees wherever possible — most rows were found directly (Wikipedia, the venue's official site, a venue database), and the rest were backfilled from a street address via a one-off Nominatim geocoding pass (see git history for `scripts/geocode-locations.mjs`, since removed). A handful of rows still hold a street address rather than coordinates, where geocoding found no match — paste that address into a map to place a pin by hand. Where no address could be found after a genuine search, Location is left blank, as are the three rows where the source gig-history file itself has no venue recorded.

Some entries are historic/defunct venues (many small Wellington and London bars/clubs), so addresses reflect their last known location where discoverable.

Every Country/City combination also has its own row with a blank Venue, giving the conventional city-centre coordinates for that city as a whole (i.e. what you'd get pinning just "City, Country" on Google Maps) — useful for a city-level overview pin. Three of these rows already existed as genuine blank-venue entries carried over from gig-history.md (Wellington, Woodville, London); the other 29 are new rows added purely for this purpose.

| Country | City | Venue | Location |
|---|---|---|---|
| Australia | Sydney | | -33.8688, 151.2093 |
| Australia | Sydney | Olympic Park | -33.84891, 151.06772 |
| France | Nimes | | 43.8367, 4.3601 |
| France | Nimes | Arènes de Nîmes | 43.83500, 4.36000 |
| France | Paris | | 48.8566, 2.3522 |
| France | Paris | Palais Omnisports de Paris-Bercy | 48.83861, 2.37848 |
| New Zealand | Auckland | | -36.8485, 174.7633 |
| New Zealand | Auckland | Auckland Town Hall | -36.85279, 174.76323 |
| New Zealand | Auckland | Mount Smart Stadium | -36.91820, 174.81240 |
| New Zealand | Auckland | Spark Arena | -36.84717, 174.77695 |
| New Zealand | Auckland | The Studio | -36.85770, 174.74800 |
| New Zealand | Auckland | The Tuning Fork | -36.84717, 174.77695 |
| New Zealand | Auckland | Vector Arena | -36.84717, 174.77695 |
| New Zealand | Christchurch | | -43.5321, 172.6362 |
| New Zealand | Christchurch | Horncastle Arena | -43.54570, 172.60120 |
| New Zealand | Christchurch | The Foundry | -43.52270, 172.58090 |
| New Zealand | Grenada North | | -41.1862, 174.8380 |
| New Zealand | Grenada North | Warehouse | |
| New Zealand | Hamilton | | -37.7870, 175.2793 |
| New Zealand | Hamilton | Hamilton Domain | -37.79900, 175.27400 |
| New Zealand | Hastings | | -39.6398, 176.8410 |
| New Zealand | Hastings | Club Ew-els | |
| New Zealand | Hastings | Stortford Lodge | -39.63400, 176.82100 |
| New Zealand | Lower Hutt | | -41.2127, 174.9059 |
| New Zealand | Lower Hutt | Lucky Jacks | |
| New Zealand | Lower Hutt | Miller Bar | |
| New Zealand | Martinborough | | -41.2167, 175.4667 |
| New Zealand | Martinborough | Luna Estate | -41.22800, 175.44700 |
| New Zealand | Napier | | -39.4928, 176.9120 |
| New Zealand | Napier | Church Road Winery | -39.53200, 176.83000 |
| New Zealand | Napier | Mission Estate Winery | -39.53430, 176.83550 |
| New Zealand | Napier | Onekawa Rockgarden | |
| New Zealand | New Plymouth | | -39.0556, 174.0752 |
| New Zealand | New Plymouth | Bowl of Brooklands | -39.06250, 174.08800 |
| New Zealand | Paraparaumu | | -40.9006, 175.0106 |
| New Zealand | Paraparaumu | Southward's Car Museum | -40.8940, 175.0292 |
| New Zealand | Paraparaumu | Te Raukura ki Kapiti | -40.92101, 174.98416 |
| New Zealand | Taupo | | -38.6857, 176.0702 |
| New Zealand | Taupo | Taupo Amphitheatre | -38.70216, 176.06316 |
| New Zealand | Upper Hutt | | -41.1259, 175.0525 |
| New Zealand | Upper Hutt | Panhead Brewery | -41.1303068, 175.0684668 |
| New Zealand | Upper Hutt | Trentham Memorial Park | -41.12827, 175.02020 |
| New Zealand | Wellington | | -41.2865, 174.7762 |
| New Zealand | Wellington | 38 Norway St | |
| New Zealand | Wellington | Antipodes | |
| New Zealand | Wellington | Athletic Park | -41.31722, 174.77694 |
| New Zealand | Wellington | BATS Theatre | -41.2940744, 174.7831551 |
| New Zealand | Wellington | Bar Bodega | -41.29264, 174.77330 |
| New Zealand | Wellington | Bar Medusa | -41.29480, 174.77534 |
| New Zealand | Wellington | Black Kat Cafe | |
| New Zealand | Wellington | Caroline | -41.29183, 174.77788 |
| New Zealand | Wellington | Circa | -41.29029, 174.78056 |
| New Zealand | Wellington | Civic Square | -41.28849, 174.77632 |
| New Zealand | Wellington | Cuba Cuba | |
| New Zealand | Wellington | Downstage | -41.2937, 174.7836 |
| New Zealand | Wellington | Dragons | |
| New Zealand | Wellington | Empire Warehouse | |
| New Zealand | Wellington | Escape | |
| New Zealand | Wellington | Hannah Playhouse | -41.2937, 174.7836 |
| New Zealand | Wellington | Indigo | -41.29415, 174.77556 |
| New Zealand | Wellington | James Cabaret | -41.2977, 174.7745 |
| New Zealand | Wellington | Kaminskys | |
| New Zealand | Wellington | Meow | -41.2937, 174.7758 |
| New Zealand | Wellington | Meow Nui | -41.2958, 174.7748 |
| New Zealand | Wellington | Metro | |
| New Zealand | Wellington | Michael Fowler Centre | -41.2862, 174.7768 |
| New Zealand | Wellington | New Carpark | |
| New Zealand | Wellington | Old St Paul's | -41.2760, 174.7774 |
| New Zealand | Wellington | Paramount Theatre | -41.2932, 174.7775 |
| New Zealand | Wellington | Phoenix | |
| New Zealand | Wellington | Queens Wharf Events Centre | -41.2823, 174.7810 |
| New Zealand | Wellington | San Fran | -41.2953, 174.7754 |
| New Zealand | Wellington | Shed 11 | -41.2831, 174.7801 |
| New Zealand | Wellington | Shed 6 | -41.2825, 174.7807 |
| New Zealand | Wellington | Show & Sports Centre | |
| New Zealand | Wellington | Sky Stadium | -41.272861, 174.785202 |
| New Zealand | Wellington | Sol Bar | |
| New Zealand | Wellington | Soundings Theatre | -41.2906361, 174.781993 |
| New Zealand | Wellington | St James Theatre | -41.29337, 174.77972 |
| New Zealand | Wellington | St John's In The City | -41.2904, 174.7761 |
| New Zealand | Wellington | Starlight Ballroom | -41.2952, 174.7748 |
| New Zealand | Wellington | State Opera House | -41.2915, 174.7778 |
| New Zealand | Wellington | Stax | -41.29415, 174.77556 |
| New Zealand | Wellington | Sub Nine | -41.29065, 174.77484 |
| New Zealand | Wellington | TSB Arena | -41.2823, 174.7810 |
| New Zealand | Wellington | The Boatshed | -41.28899, 174.78020 |
| New Zealand | Wellington | The Dell | -41.28343, 174.76547 |
| New Zealand | Wellington | The Opera House | -41.29150, 174.77780 |
| New Zealand | Wellington | The Thistle Inn | -41.27770, 174.77963 |
| New Zealand | Wellington | Thistle Hall | -41.29735, 174.77361 |
| New Zealand | Wellington | Union Hall | |
| New Zealand | Wellington | Valhalla | -41.29480, 174.77534 |
| New Zealand | Wellington | Waitangi Park | -41.29200, 174.78300 |
| New Zealand | Wellington | Wellington Show + Sports Centre | |
| New Zealand | Wellington | Wellington Town Hall | -41.28938, 174.77706 |
| New Zealand | Wellington | Westpac Stadium | -41.27290, 174.78520 |
| New Zealand | Woodville | | -40.3383, 175.8720 |
| New Zealand | Woodville | Airlie Brae | |
| The Netherlands | Amsterdam | | 52.3676, 4.9041 |
| The Netherlands | Amsterdam | Melkweg Oude Zaal | Lijnbaansgracht 234A, 1017 PH Amsterdam, Netherlands |
| The Netherlands | Amsterdam | Paradiso | 52.36219, 4.88382 |
| The Netherlands | Utrecht | | 52.0907, 5.1214 |
| The Netherlands | Utrecht | Jaarbeurs (Trance Energy) | 52.08778, 5.10684 |
| United Kingdom | Edinburgh | | 55.9533, -3.1883 |
| United Kingdom | Edinburgh | C Cubed Temple | Brodie's Close, 493 Lawnmarket, Royal Mile, Edinburgh EH1 2LR, UK |
| United Kingdom | Edinburgh | Grassmarket | 55.94738, -3.19595 |
| United Kingdom | Glasgow | | 55.8642, -4.2518 |
| United Kingdom | Glasgow | SECC | Exhibition Way, Glasgow G3 8YW, UK |
| United Kingdom | London | | 51.5072, -0.1276 |
| United Kingdom | London | 100 Club | 51.5152, -0.1364 |
| United Kingdom | London | 12 Acklam Rd | 51.5204, -0.2066 |
| United Kingdom | London | 93 Feet East | 51.5197, -0.0695 |
| United Kingdom | London | Adelphi Theatre | 51.5106, -0.1215 |
| United Kingdom | London | Alexandra Palace | 51.5942, -0.1308 |
| United Kingdom | London | Apollo Theatre | 51.5117, -0.1315 |
| United Kingdom | London | Arts Theatre | 51.5117, -0.1281 |
| United Kingdom | London | Barbican Hall | 51.5202, -0.0950 |
| United Kingdom | London | Barfly | 51.5414, -0.1467 |
| United Kingdom | London | Battersea Power Station | 51.4817, -0.1447 |
| United Kingdom | London | Borderline | 51.5142, -0.1308 |
| United Kingdom | London | Brixton Academy | 51.46563, -0.11497 |
| United Kingdom | London | Bush Hall | 51.50652, -0.23161 |
| United Kingdom | London | Clapham Common | 51.4618, -0.1384 |
| United Kingdom | London | Coliseum | 51.5100, -0.1281 |
| United Kingdom | London | Comedy Theatre | 51.5088, -0.1319 |
| United Kingdom | London | Dominion Theatre | 51.5165, -0.1308 |
| United Kingdom | London | Earls Court | 51.48889, -0.19778 |
| United Kingdom | London | Electric Ballroom | 51.5399, -0.1426 |
| United Kingdom | London | Electrowerkz | 51.5325, -0.1047 |
| United Kingdom | London | Gielgud Theatre | 51.5122, -0.1317 |
| United Kingdom | London | Hackney Empire | 51.5457, -0.0553 |
| United Kingdom | London | Hammersmith Apollo | 51.4919, -0.2226 |
| United Kingdom | London | Her Majesty's Theatre | 51.50828, -0.13175 |
| United Kingdom | London | Hyde Park | 51.50730, -0.16570 |
| United Kingdom | London | ICA | 51.50640, -0.13130 |
| United Kingdom | London | IndigO2 (The O2) | 51.50300, 0.00320 |
| United Kingdom | London | Islington Academy | 51.53450, -0.10580 |
| United Kingdom | London | Jazz Cafe | 51.53873, -0.14306 |
| United Kingdom | London | KOKO | 51.53390, -0.14250 |
| United Kingdom | London | Leicester Square Theatre | 51.51130, -0.13010 |
| United Kingdom | London | London Astoria | 51.51583, -0.13056 |
| United Kingdom | London | London Coliseum | 51.50998, -0.12626 |
| United Kingdom | London | Lyceum Theatre | 51.51154, -0.12008 |
| United Kingdom | London | Lyric Hammersmith | 51.49306, -0.22642 |
| United Kingdom | London | Lyric Theatre | 51.51131, -0.13377 |
| United Kingdom | London | Lyttelton Theatre | 51.50687, -0.11406 |
| United Kingdom | London | Mean Fiddler | |
| United Kingdom | London | Ministry of Sound | 51.49762, -0.09947 |
| United Kingdom | London | Noel Coward Theatre | 51.51105, -0.12722 |
| United Kingdom | London | Novello Theatre | 51.51250, -0.11943 |
| United Kingdom | London | Olivier Theatre | 51.50719, -0.11391 |
| United Kingdom | London | Olympia Grand Hall | 51.49790, -0.20820 |
| United Kingdom | London | Punk (Soho) | 51.51590, -0.13290 |
| United Kingdom | London | Relentless Garage | 51.54780, -0.10270 |
| United Kingdom | London | Ronnie Scott's Jazz Club | 51.51344, -0.13158 |
| United Kingdom | London | Roundhouse | 51.54343, -0.15215 |
| United Kingdom | London | Royal Albert Hall | 51.50112, -0.17742 |
| United Kingdom | London | Royal Festival Hall | 51.50576, -0.11679 |
| United Kingdom | London | Royal Opera House | 51.51287, -0.12245 |
| United Kingdom | London | Savoy Theatre | 51.51017, -0.12087 |
| United Kingdom | London | Scala | 51.53050, -0.12070 |
| United Kingdom | London | Shakespeare's Globe | 51.50810, -0.09713 |
| United Kingdom | London | Shepherd's Bush Empire | 51.50470, -0.22110 |
| United Kingdom | London | Somerset House | 51.50660, -0.11700 |
| United Kingdom | London | The Forum | 51.55213, -0.14221 |
| United Kingdom | London | The O2 Arena | 51.50303, 0.00323 |
| United Kingdom | London | The Old Vic | 51.50197, -0.10935 |
| United Kingdom | London | The Pigalle Club | 51.50890, -0.13520 |
| United Kingdom | London | The Tower of London | 51.50810, -0.07590 |
| United Kingdom | London | The Venue Theatre | 51.47570, -0.03550 |
| United Kingdom | London | Theatre Royal Drury Lane | 51.51296, -0.12015 |
| United Kingdom | London | Theatre Royal Haymarket | 51.50855, -0.13148 |
| United Kingdom | London | Tower of London | 51.50810, -0.07590 |
| United Kingdom | London | Trafalgar Studios | 51.50663, -0.12764 |
| United Kingdom | London | Troxy | 51.51287, -0.04401 |
| United Kingdom | London | Twickenham Stadium | 51.45520, -0.34060 |
| United Kingdom | London | UCL Bloomsbury | 51.5257, -0.1317 |
| United Kingdom | London | ULU | 51.5211, -0.1308 |
| United Kingdom | London | Underworld Camden | 51.5391, -0.1427 |
| United Kingdom | London | Union Chapel | 51.54474, -0.10250 |
| United Kingdom | London | Vandella | 51.5023, -0.2260 |
| United Kingdom | London | Vaudeville Theatre | 51.5100, -0.1212 |
| United Kingdom | London | Victoria Park | 51.53654, -0.03915 |
| United Kingdom | London | Wembley Arena | 51.55508, -0.27954 |
| United Kingdom | London | Wembley Stadium | 51.55603, -0.27967 |
| United Kingdom | London | XOYO | 51.5266, -0.0871 |
| United Kingdom | London | Young Vic | 51.5028, -0.1091 |
| United Kingdom | Manchester | | 53.4808, -2.2426 |
| United Kingdom | Manchester | O2 Apollo | 53.4649, -2.2158 |
| United Kingdom | Milton Keynes | | 52.0406, -0.7594 |
| United Kingdom | Milton Keynes | Milton Keynes Bowl | 52.0091, -0.7730 |
| United Kingdom | Nottingham | | 52.9548, -1.1581 |
| United Kingdom | Nottingham | Sherwood Pines Park | 53.1648, -1.0678 |
| United Kingdom | Reading | | 51.4543, -0.9781 |
| United Kingdom | Reading | Richfield Avenue | 51.4646, -0.9699 |
| United Kingdom | Stratford-upon-Avon | | 52.1917, -1.7073 |
| United Kingdom | Stratford-upon-Avon | Royal Shakespeare Theatre | 52.1917, -1.7078 |
| United Kingdom | Tetbury | | 51.6435, -2.1594 |
| United Kingdom | Tetbury | Westonbirt Arboretum | 51.6068, -2.2209 |
| United States of America | Fort Lauderdale | | 26.1224, -80.1373 |
| United States of America | Fort Lauderdale | Markham Park | 26.1366, -80.3305 |
| United States of America | Los Angeles | | 34.0522, -118.2437 |
| United States of America | Los Angeles | Greek Theatre | 34.1200, -118.2943 |
| United States of America | Los Angeles | The Troubador | 34.0819, -118.3892 |
| United States of America | San Bernadino | | 34.1083, -117.2898 |
| United States of America | San Bernadino | Glen Helen Pavilion | 34.2043, -117.4022 |
| United States of America | San Francisco | | 37.7749, -122.4194 |
| United States of America | San Francisco | The Fillmore | 37.78410, -122.43313 |
