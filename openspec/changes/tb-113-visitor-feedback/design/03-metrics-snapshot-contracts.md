# Normative Metrics and Snapshot Contracts

Pure `teleferico-app/packages/survey-reporting-core` owns these contracts with no Node/browser/framework/Strapi/renderer/model dependency. Counts are integers, ratios basis points (`0..10000`), averages milli-stars (`1000..5000`); division rounds half-up and zero denominator yields `null`.

## Population and Formulas

Interpret inclusive `from,to` in `America/Argentina/Buenos_Aires`, convert to UTC; previous immediately precedes current with equal days. Capture `dataCutoffAt` before CMS read. Include accepted `valid_qr` records inside bounds, `acceptedAt<=cutoff`, matching optional point/version; later point inactivity preserves history. Order `acceptedAt ASC,receipt ASC`; periods never overlap.

For period `P`, `n=|P|`, `sum=Σrating`: average=`n?round(sum*1000/n):null`; star 1..5 count/rate=`count,n?round(count*10000/n):null`; satisfied=4–5, neutral=3, unfavorable=1–2 use the same denominator. Count delta=current−previous; average/rate delta is null if either side is unavailable. Emit every local date; volume=count and daily satisfaction uses the day denominator. Aspect denominator is ratings/key; QR denominator is submissions/point. Recurrent threshold=`max(10,ceil(commentCount*2/100))`; minority=4 unique refs; recurrent wins overlap; unsupported=`insufficient_evidence`.

Order dates/stars ascending; aspects `sortOrder,aspectKey`; points `sortOrder,pointKey`. Submitted `otherAspect` normalizes to a distinct snapshotted Aspectos rating, never a general comment/model narrative.

## Closed Types

```ts
// Normative
type PopulationMetaV1={source:"valid_qr";timeZone:"America/Argentina/Buenos_Aires";current:{from:string;to:string;utcStart:string;utcEnd:string};previous:{from:string;to:string;utcStart:string;utcEnd:string};dataCutoffAt:string;filters:{pointKey:string|null;versionKey:string|null};currentSubmissionCount:number;previousSubmissionCount:number;currentCommentCount:number;previousCommentCount:number;excludedAfterCutoffCount:number;populationDigest:string};
type SentimentV1={total:number;positive:{count:number;rateBps:number|null};neutral:{count:number;rateBps:number|null};negative:{count:number;rateBps:number|null}};
type StarV1={star:1|2|3|4|5;count:number;rateBps:number|null};
type PeriodV1={submissionCount:number;commentCount:number;averageMilliStars:number|null;starDistribution:[StarV1,StarV1,StarV1,StarV1,StarV1];satisfied:{count:number;rateBps:number|null};neutral:{count:number;rateBps:number|null};unfavorable:{count:number;rateBps:number|null}};
type DeltasV1={submissionCount:number;commentCount:number;averageMilliStars:number|null;satisfiedRateBps:number|null;neutralRateBps:number|null;unfavorableRateBps:number|null};
type DailyV1={period:"current"|"previous";date:string;submissionCount:number;satisfactionRateBps:number|null};
type AspectV1={aspectKey:string;sortOrder:number;labelVariants:Array<{label:string;count:number}>;current:SentimentV1;previous:SentimentV1};
type PointV1={pointKey:string;displayName:string;sortOrder:number;current:PeriodV1;previous:PeriodV1};
type CommentRecordV1={recordId:string;receipt:string;period:"current"|"previous";acceptedAt:string;locale:"es"|"en"|"pt";versionKey:string;pointKey:string;overallRating:1|2|3|4|5;aspectRatings:Array<{aspectKey:string;label:string;sortOrder:number;rating:"positive"|"neutral"|"negative"}>;text:string};
type SnapshotV1={contractVersion:"survey-snapshot.v1";sourceRevision:string;createdAt:string;population:PopulationMetaV1;metrics:{current:PeriodV1;previous:PeriodV1;deltas:DeltasV1;daily:DailyV1[];aspects:AspectV1[];qrPoints:PointV1[]};comments:CommentRecordV1[]};
type SnapshotEnvelopeV1={canonicalization:"tb-json.v1";algorithm:"sha256";digestHex:string;payload:SnapshotV1};
```

Only nonblank general comments enter `comments`; order current before previous, then time/record ID; original text is unchanged. `populationDigest` hashes ordered `(period,receipt,acceptedAt,versionKey,pointKey,payloadDigest)` plus filters/cutoff. Across versions, aspect order uses minimum snapshotted order; exact label variants order by count descending then label ascending.

## Canonical JSON and Charts

`tb-json.v1` accepts null/boolean/string/safe integer/array/object only; rejects floats, duplicate/unknown keys, undefined, nonfinite values, and unpaired surrogates. UTF-8 has no BOM/whitespace; keys sort by Unicode code point; arrays retain contract order; strings use mandatory JSON escaping without optional slash escaping; integers use canonical decimal. SHA-256 lowercase hex covers payload bytes. Creation validates formulas/counts/membership then freezes; worker validates schema/version/digest/counts and never recomputes metrics.

`ChartViewModelV1={version:"chart-view-model.v1",id,title,description,unit,categories,series,annotations,emptyState,table}`; values are integer/null, colors semantic tokens, table mirrors labels/values/units. Adapters cannot reorder, omit, or alter semantics.
