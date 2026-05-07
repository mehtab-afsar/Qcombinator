-- Drop IQ v1 scoring tables — superseded by Q-Score v2 (sector_weight_profiles, qscore_benchmarks)
-- The features/iq calculator that wrote to these tables has been removed.
-- Order matters: indicator_scores references iq_scores, iq_scores references iq_indicators.

DROP TABLE IF EXISTS iq_indicator_scores;
DROP TABLE IF EXISTS iq_scores;
DROP TABLE IF EXISTS iq_indicators;
DROP TABLE IF EXISTS iq_parameter_weights;

-- Legacy 6-dimension threshold config — superseded by sector_weight_profiles (P1–P6)
DROP TABLE IF EXISTS qscore_thresholds;
DROP TABLE IF EXISTS qscore_dimension_weights;
