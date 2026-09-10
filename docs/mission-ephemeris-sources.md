# Mission ephemeris source record

Generated 2026-09-10 with `node scripts/fetch-mission-ephemeris.mjs`. The output is `public/assets/data/missions/ephemeris.json`. All positions are kilometres relative to the stated target center, all velocities are km/s, and timestamps are UTC. Sample spacing is 300 seconds. No light-time or stellar-aberration correction is applied. The JSON contains source URLs, source filenames, frame, time scale, units and provenance labels for each track.

| Mission and phase | UTC interval | Source/provenance | Center range |
| --- | --- | --- | --- |
| Hayabusa2 approach | 2018-06-26 00:00 to 2018-06-28 00:00 | JAXA final after-the-fact approach orbit determination | 20.04–23.55 km |
| Hayabusa2 departure | 2019-11-13 00:00 to 2019-11-14 00:00 | JAXA HPNAV mission prediction | 19.99–28.61 km |
| OSIRIS-REx arrival | 2018-12-02 00:00 to 2018-12-04 00:00 | Horizons mission navigation solution | 14.20–26.05 km |
| OSIRIS-REx departure | 2021-05-10 18:00 to 2021-05-11 00:00 | Horizons mission prediction | 320.85–3614.68 km |
| Hayabusa2 Earth flyby | 2015-12-03 04:08 to 16:08 | Horizons mission navigation solution | sampled minimum 9520.83 km |
| OSIRIS-REx Earth flyby | 2017-09-22 10:52 to 22:52 | Horizons mission navigation solution | sampled minimum 23592.00 km |

## Hayabusa2

The [official JAXA/NAIF archive description](https://naif.jpl.nasa.gov/pub/naif/pds/pds4/hyb2/hyb2_spice/document/spiceds_v001.html) distinguishes the final approach solution from HPNAV predictions. It also documents gaps and interpolation problems in other products; those shape-derived products are not used here.

Arrival uses `hyb2_approach_od_v20180811114238.bsp` with `2162173_ryugu_approach_od_v01.bsp`. Departure uses `hyb2_hpk_20180627_20191119_v01.bsp` with `2162173_ryugu_hpk_proximity_v01.bsp`. The four files are approximately 7 MB total and their MD5 checksums are checked against their PDS4 labels on generation. The [kernel directory](https://naif.jpl.nasa.gov/pub/naif/pds/pds4/hyb2/hyb2_spice/spice_kernels/spk/) provides files and labels.

SPICE `spkezr('-37', ET, 'J2000', 'NONE', '2162173')` produces relative inertial states. `naif0012.tls` performs the UTC-to-ET conversion. The departure kernel's dynamic home-position frame is converted with the official `hyb2_hp_v01.tf` and compact `hyb2_de430.bsp` planetary ephemeris. The approach and departure kernel pairs are loaded separately to preserve their corresponding Ryugu solutions.

The departure prediction has a material solution join: range is 19.988803 km at 00:55 UTC, then 22.238517 km at 01:00 UTC. This is not continuous flown motion. The 01:00 sample has `breakBefore: true`, and `playbackStartIndex: 12` selects the continuous 01:00–24:00 interval by default. Do not interpolate or draw a continuous trail across that boundary. Retain the earlier samples solely as provenance of the complete requested interval. The default departure therefore starts at 22.24 km, with the mission-prediction label.

## OSIRIS-REx and Earth flybys

[JPL Horizons API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html) describes the vector query. Requests use `REF_PLANE=FRAME`, `REF_SYSTEM=ICRF`, `TIME_TYPE=UT`, `VEC_CORR=NONE`, `OUT_UNITS=KM-S` and `VEC_TABLE=2`. Each full reproducible URL is saved in the JSON. Contemporary dates returned as UT are UTC, as explained in the returned Horizons footer.

The OSIRIS-REx Horizons object record directs mission-relative computations to Bennu center `@2101955`, the final reconstructed mission asteroid solution. Ordinary asteroid lookup `101955;` is not substituted. Arrival spacecraft sources are `orx_180801_190302_181218_od077-N-M1A-L-M0D_v1` and `orx_181203_190302_190104_od085-N-M0D-P_v1`. The departure interval is supplied by `64_pred_20210424_20231001_od317_v0.1`; its name and provenance require the prediction label. The mission-navigation arrival label does not assert that every spacecraft segment is a final reconstruction.

Earth-relative requests use center `@399`, spacecraft `-37` or `-64`, and the same ICRF/UTC/geometric-vector settings. The sample minima agree with the close-approach distances stated in the Horizons mission records. They are center distances, not altitude, and discrete 5-minute samples do not determine the exact closest-approach instant.

## Reproduction and validation

Run with Node.js supporting built-in fetch and Python with `spiceypy`. Set `PYTHON` if the Python executable is not on PATH. Optionally set `PYTHONPATH` for a temporary package installation and `MISSION_EPHEMERIS_CACHE` for the kernel/raw-response cache. The script downloads official data sequentially, checks four PDS kernel checksums, fails on SPICE coverage errors, validates Horizons frame and finite six-component state vectors, and checks uniform 300-second spacing. Raw Horizons responses are retained in the cache for metadata review.

The website must preserve source geometry and physical scale. Interpolation between samples is a display approximation and must respect `breakBefore`. A thrust maneuver can change velocity inside one 5-minute interval. The ephemerides provide no spacecraft attitude, thruster on/off history or detailed body surface registration; those are not measured by these tracks. Source-defined inertial vectors must not be treated as body-fixed longitude/latitude.
