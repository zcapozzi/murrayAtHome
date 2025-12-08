Select speller, DATE(datestamp)
, sum(CASE WHEN attempt=answer THEN 1 ELSE 0 END) correct
, count(1) correct
, sum(CASE WHEN attempt=answer THEN 1 ELSE 0 END)/ count(1) pctCorrect

from Spelling_Word_Attempts where speller='Will'
group by speller, DATE(datestamp)
order by DATE(datestamp) desc;
