# Isotopo di riferimento per ogni elemento (numero di massa A): da qui protoni (Z) e neutroni (A - Z).
# Elementi con composizione naturale: isotopo con la maggiore abbondanza rappresentativa
#   Fonte: IUPAC CIAAW, Table of Isotopic Compositions of the Elements, https://www.ciaaw.org/isotopic-abundances.htm
# Elementi senza composizione naturale: isotopo piu' stabile noto (emivita piu' lunga)
#   Fonte: IUPAC CIAAW, Radioactive elements (dalla valutazione NUBASE2020), https://ciaaw.org/radioactive-elements.htm
# Formato: Z: (A, abbondanza come pubblicata oppure None, emivita come pubblicata oppure None)
ISOTOPI = {
1:(1,'[0,99972; 0,99999]',None),2:(4,'0,999998',None),3:(7,'[0,922; 0,981]',None),4:(9,'1',None),5:(11,'[0,796; 0,811]',None),
6:(12,'[0,9884; 0,9904]',None),7:(14,'[0,99578; 0,99663]',None),8:(16,'[0,99738; 0,99776]',None),9:(19,'1',None),10:(20,'0,9048',None),
11:(23,'1',None),12:(24,'[0,7888; 0,7905]',None),13:(27,'1',None),14:(28,'[0,92191; 0,92318]',None),15:(31,'1',None),
16:(32,'[0,9441; 0,9529]',None),17:(35,'[0,755; 0,761]',None),18:(40,'[0,936; 1,000]',None),19:(39,'0,932581',None),20:(40,'0,96941',None),
21:(45,'1',None),22:(48,'0,7372',None),23:(51,'0,99750',None),24:(52,'0,83789',None),25:(55,'1',None),
26:(56,'0,91754',None),27:(59,'1',None),28:(58,'0,680769',None),29:(63,'0,6915',None),30:(64,'0,4917',None),
31:(69,'0,60108',None),32:(74,'0,3652',None),33:(75,'1',None),34:(80,'0,4980',None),35:(79,'[0,505; 0,508]',None),
36:(84,'0,56987',None),37:(85,'0,7217',None),38:(88,'0,8258',None),39:(89,'1',None),40:(90,'0,5147',None),
41:(93,'1',None),42:(98,'0,24292',None),43:(98,None,'4,2 milioni di anni'),44:(102,'0,3155',None),45:(103,'1',None),
46:(106,'0,2733',None),47:(107,'0,51839',None),48:(114,'0,28754',None),49:(115,'0,95719',None),50:(120,'0,3258',None),
51:(121,'0,5721',None),52:(130,'0,3408',None),53:(127,'1',None),54:(132,'0,26909',None),55:(133,'1',None),
56:(138,'0,7170',None),57:(139,'0,9991119',None),58:(140,'0,88450',None),59:(141,'1',None),60:(142,'0,27152',None),
61:(145,None,'17,7 anni'),62:(152,'0,2674',None),63:(153,'0,5219',None),64:(158,'0,24820',None),65:(159,'1',None),
66:(164,'0,28260',None),67:(165,'1',None),68:(166,'0,33503',None),69:(169,'1',None),70:(174,'0,31896',None),
71:(175,'0,97414',None),72:(180,'0,3512',None),73:(181,'0,9998824',None),74:(184,'0,3064',None),75:(187,'0,6260',None),
76:(192,'0,4078',None),77:(193,'0,6277',None),78:(195,'0,33775',None),79:(197,'1',None),80:(202,'0,2974',None),
81:(205,'[0,7041; 0,7056]',None),82:(208,'[0,0338; 0,9775]',None),83:(209,'1',None),
84:(209,None,'124 anni'),85:(210,None,'8,1 ore'),86:(222,None,'3,82 giorni'),87:(223,None,'22 minuti'),88:(226,None,'1600 anni'),
89:(227,None,'21,8 anni'),90:(232,'0,9998',None),91:(231,'1',None),92:(238,'0,992742',None),
93:(237,None,'2,14 milioni di anni'),94:(244,None,'81,3 milioni di anni'),95:(243,None,'7350 anni'),96:(247,None,'15,6 milioni di anni'),
97:(247,None,'1380 anni'),98:(251,None,'898 anni'),99:(252,None,'471,7 giorni'),100:(257,None,'100,5 giorni'),101:(258,None,'51,6 giorni'),
102:(259,None,'58 minuti'),103:(266,None,'circa 22 ore'),104:(267,None,'circa 2,5 ore'),105:(268,None,'circa 29 ore'),106:(269,None,'circa 5 minuti'),
107:(270,None,'circa 4 minuti'),108:(269,None,'circa 15 secondi'),109:(277,None,'circa 9 secondi'),110:(281,None,'circa 14 secondi'),
111:(282,None,'circa 2 minuti'),112:(285,None,'circa 30 secondi'),113:(286,None,'circa 12 secondi'),114:(290,None,'circa 80 secondi'),
115:(290,None,'meno di un secondo'),116:(293,None,'circa 70 millisecondi'),117:(294,None,'circa 70 millisecondi'),118:(294,None,'meno di un millisecondo'),
}
