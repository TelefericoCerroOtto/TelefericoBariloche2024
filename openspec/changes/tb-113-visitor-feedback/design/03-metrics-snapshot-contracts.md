# Normative Metrics and Snapshot Contracts

Pure `teleferico-app/packages/survey-reporting-core` owns these contracts with no Node/browser/framework/Strapi/renderer/model dependency. Counts and absolute values are nonnegative integers; absolute rates are basis points in `0..10000`, and non-null absolute averages are milli-stars in `1000..5000`. Delta fields and relative response changes are signed safe integers, may be negative or exceed `10000`, and are never clamped to absolute-rate bounds. Division rounds half-up and zero denominator yields `null`, including relative response change when the previous count is zero.

## Exact Arithmetic Domain

Raw count and aggregation operands MUST be read losslessly from persistence as validated nonnegative base-10 integer text or native BigInt and converted directly to BigInt before arithmetic; they MUST NOT pass through JavaScript `Number` first. Counts, sums, products, differences, doubled median numerators, scaling by 2/1000/10000, and half-up division MUST use BigInt intermediates. This contract imposes no artificial population cap and requires no new dependency.

For signed integer numerator `N` and positive integer denominator `D`, sign-aware half-up is `sign(N) * (abs(N) / D + (2 * (abs(N) % D) >= D ? 1 : 0))`, using BigInt integer division and remainder throughout; zero has positive sign. A contractually nullable zero denominator, including zero previous response count, returns `null` before division and is not overflow. Every other nonpositive denominator is invalid.

`tb-json.v1` remains integer-only and MUST contain JSON numbers, never BigInt values or numeric strings. Before serializing each final numeric field, validate its semantic range and JavaScript safe-integer bounds, then convert that final BigInt to a JSON number. Absolute rates remain `0..10000` basis points and non-null absolute averages remain `1000..5000` milli-stars. Signed deltas and relative changes MAY exceed absolute-rate bounds but MUST remain safe integers.

Malformed or forbidden-negative input, an invalid denominator, use of a non-BigInt arithmetic intermediate, or a final value outside its semantic or safe-integer range MUST abort the entire snapshot before persistence with typed `metric_overflow`, unless an already-normative more specific invalid-input code applies. The pipeline MUST NOT clamp, wrap, approximate, serialize ad hoc strings, partially persist, or continue AI/report processing.

## Population and Formulas

Interpret inclusive `from,to` in `America/Argentina/Buenos_Aires`, convert to UTC; previous immediately precedes current with equal days. Calendar trend buckets are local day, Monday-Sunday week, or calendar month, clipped at both analyzed-range edges; never range-anchored 7/30-day chunks. Capture `dataCutoffAt` before CMS read. Include accepted `valid_qr` records inside bounds, `acceptedAt<=cutoff`, matching the route-specific scope; later point inactivity preserves history. Order `acceptedAt ASC,receipt ASC`; periods never overlap.

For period `P`, `n=|P|`, `sum=Σrating`: average=`n?roundHalfUp(sum*1000/n):null`; star 1..5 count/rate=`count,n?roundHalfUp(count*10000/n):null`; satisfied=4–5, neutral=3, unfavorable=1–2 use the same denominator. Count delta=`current−previous`; relative count change=`previous?roundHalfUp((current−previous)*10000/previous):null`; average/rate delta is null if either side is unavailable. Summary displays relative response change while retaining absolute delta. Every calendar bucket emits volume and satisfaction using that bucket's submissions. QR denominator is submissions/point. Recurrent threshold=`max(10,ceil(commentCount*2/100))`; minority=4 unique refs; recurrent wins overlap; unsupported=`insufficient_evidence`.

Survey definitions order `sortOrder,aspectKey`; analytics aspect rows order `selectionCount DESC,sortOrder,aspectKey`; dates/stars ascend and points order `sortOrder,pointKey`. For aspect `a`, `selectionRate=count(submissions selecting a)/eligibleSubmissionCount`; its evidence threshold is `max(10,ceil(eligibleSubmissionCount*5/100))` in the current global or point scope. Sentiment rates divide by selections of `a` in the same scope/bucket. Empty buckets emit zero counts and null rates.

Strength is strict unique positive dominance; opportunity is strict unique negative dominance. Exclude ties and neutral dominance. Rank each class by dominant count descending, selection count descending, stable key ascending; cap three. Related rating by sentiment emits cohort count and `count?roundHalfUp(sumOverallRating*1000/count):null`.

Priority matrix uses X=`selectionCount`, Y=`negativeRateBps`. Exclude `other` and below-threshold aspects from medians and quadrants; their `quadrant` is null and the projection exposes the intended excluded or insufficient-evidence state. Compute and serialize only doubled integer median numerators with BigInt intermediates: odd count → `2 * middle`; even count → `lowerMiddle + upperMiddle`. High relevance=`2*X>=medianSelectionCountTimesTwo`; high negativity=`2*Y>medianNegativeRateBpsTimesTwo`, with every operand promoted to BigInt. Map high+low→`strength`, high+high→`priority`, low+high→`specific`, low+low→`secondary`; X equality is high and Y equality is low. Zero qualifying aspects yield null doubled medians and no classifications; one uses twice its own X and Y. Safe-check each final doubled value before JSON-number serialization or display projection. Display projections divide the doubled integer by two when needed, but canonical snapshot validation recomputes and compares the doubled integer without float serialization.

Five-star association per eligible non-`other` aspect uses `positive selections / all eligible submissions` separately for rating=5 and rating=1..4, then `fiveStarRateBps-oneToFourRateBps`. If either cohort is empty, its rate and the difference are null. Sort difference descending then stable key. `other` retains original custom text, sentiment, overall rating, date, and QR context; never recategorize it and exclude it from strengths/opportunities, matrix, and association.

UI formatting renders counts as integers, milli-stars to one decimal, and basis-point percentages to one decimal without changing exact stored values. No invitation/scan response rate exists before a formal denominator.

## Closed Types

```ts
// Normative
type PopulationMetaV1={source:"valid_qr";timeZone:"America/Argentina/Buenos_Aires";current:{from:string;to:string;utcStart:string;utcEnd:string};previous:{from:string;to:string;utcStart:string;utcEnd:string};dataCutoffAt:string;filters:{pointKey:string|null;versionKey:string|null};currentSubmissionCount:number;previousSubmissionCount:number;currentCommentCount:number;previousCommentCount:number;excludedAfterCutoffCount:number;populationDigest:string};
type SentimentV1={total:number;positive:{count:number;rateBps:number|null};neutral:{count:number;rateBps:number|null};negative:{count:number;rateBps:number|null}};
type StarV1={star:1|2|3|4|5;count:number;rateBps:number|null};
type PeriodV1={submissionCount:number;commentCount:number;averageMilliStars:number|null;starDistribution:[StarV1,StarV1,StarV1,StarV1,StarV1];satisfied:{count:number;rateBps:number|null};neutral:{count:number;rateBps:number|null};unfavorable:{count:number;rateBps:number|null}};
type DeltasV1={submissionCount:number;submissionPercentBps:number|null;commentCount:number;averageMilliStars:number|null;satisfiedRateBps:number|null;neutralRateBps:number|null;unfavorableRateBps:number|null};
type CalendarBucketV1={period:"current"|"previous";unit:"day"|"week"|"month";from:string;to:string;submissionCount:number;satisfactionRateBps:number|null};
type AspectTrendBucketV1={unit:"day"|"week"|"month";from:string;to:string;selectionCount:number;sentiment:SentimentV1};
type RelatedRatingV1={sentiment:"positive"|"neutral"|"negative";submissionCount:number;averageMilliStars:number|null};
type AspectV1={aspectKey:string;sortOrder:number;labelVariants:Array<{label:string;count:number}>;selectionCount:number;selectionRateBps:number|null;evidenceThreshold:number;hasSufficientEvidence:boolean;current:SentimentV1;previous:SentimentV1;relatedOverallRating:RelatedRatingV1[];trend:AspectTrendBucketV1[]};
type MatrixPointV1={aspectKey:string;xSelectionCount:number;yNegativeRateBps:number|null;medianSelectionCountTimesTwo:number|null;medianNegativeRateBpsTimesTwo:number|null;quadrant:"strength"|"priority"|"specific"|"secondary"|null};
type FiveStarAssociationV1={aspectKey:string;fiveStarPositiveRateBps:number|null;oneToFourPositiveRateBps:number|null;differenceBps:number|null};
type OtherAspectRecordV1={receipt:string;text:string;sentiment:"positive"|"neutral"|"negative";overallRating:1|2|3|4|5;acceptedAt:string;pointKey:string};
type PointV1={pointKey:string;displayName:string;sortOrder:number;current:PeriodV1;previous:PeriodV1};
type CommentRecordV1={recordId:string;receipt:string;period:"current"|"previous";acceptedAt:string;locale:"es"|"en"|"pt";versionKey:string;pointKey:string;overallRating:1|2|3|4|5;aspectRatings:Array<{aspectKey:string;label:string;sortOrder:number;rating:"positive"|"neutral"|"negative"}>;text:string};
type SnapshotV1={contractVersion:"survey-snapshot.v1";sourceRevision:string;createdAt:string;population:PopulationMetaV1;metrics:{current:PeriodV1;previous:PeriodV1;deltas:DeltasV1;calendar:CalendarBucketV1[];aspects:AspectV1[];matrix:MatrixPointV1[];fiveStarAssociation:FiveStarAssociationV1[];otherAspects:OtherAspectRecordV1[];qrPoints:PointV1[]};comments:CommentRecordV1[]};
type SnapshotEnvelopeV1={canonicalization:"tb-json.v1";algorithm:"sha256";digestHex:string;payload:SnapshotV1};
```

Only nonblank general comments enter `comments`; order current before previous, then time/record ID; original text is unchanged. `populationDigest` hashes ordered `(period,receipt,acceptedAt,versionKey,pointKey,payloadDigest)` plus filters/cutoff. Across versions, aspect order uses minimum snapshotted order; exact label variants order by count descending then label ascending.

## Canonical JSON and Charts

`tb-json.v1` accepts null/boolean/string/safe integer/array/object only; rejects floats, duplicate/unknown keys, undefined, nonfinite values, and unpaired surrogates. UTF-8 has no BOM/whitespace; keys sort by Unicode code point; arrays retain contract order; strings use mandatory JSON escaping without optional slash escaping; integers use canonical decimal. SHA-256 lowercase hex covers payload bytes. Creation validates formulas/counts/membership then freezes; worker validates schema/version/digest/counts and never recomputes metrics.

`ChartViewModelV1={version:"chart-view-model.v1",id,title,description,unit,categories,series,annotations,emptyState,table}`; values are integer/null, colors semantic tokens, table mirrors labels/values/units. Adapters cannot reorder, omit, or alter semantics.
