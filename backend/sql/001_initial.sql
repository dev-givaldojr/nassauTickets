-- Executado dentro do banco configurado em DB_NAME.
-- Reexecutável: não apaga tabelas nem senhas existentes.
CREATE TABLE IF NOT EXISTS queue_control (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  last_day CHAR(6) NULL,
  last_type ENUM('SP', 'SE', 'SG') NULL,
  CONSTRAINT single_control CHECK (id = 1)
) ENGINE=InnoDB;

INSERT IGNORE INTO queue_control (id) VALUES (1);

CREATE TABLE IF NOT EXISTS tickets (
  id VARCHAR(12) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  day CHAR(6) CHARACTER SET ascii NOT NULL,
  type ENUM('SP', 'SE', 'SG') NOT NULL,
  sequence_number SMALLINT UNSIGNED NOT NULL,
  status ENUM('AGUARDANDO', 'CHAMADA', 'CHAMADA_NOVAMENTE', 'EM_ATENDIMENTO', 'ATENDIDA', 'NÃO_COMPARECEU', 'DESCARTADA') NOT NULL,
  issued_at DATETIME(3) NOT NULL,
  first_called_at DATETIME(3) NULL,
  second_called_at DATETIME(3) NULL,
  started_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  desk TINYINT UNSIGNED NULL,
  active_desk TINYINT UNSIGNED GENERATED ALWAYS AS (
    CASE WHEN status IN ('CHAMADA','CHAMADA_NOVAMENTE','EM_ATENDIMENTO') THEN desk ELSE NULL END
  ) STORED,
  UNIQUE KEY unique_daily_sequence (day, type, sequence_number),
  UNIQUE KEY unique_active_desk (active_desk),
  KEY tickets_status (status),
  CONSTRAINT valid_sequence CHECK (sequence_number BETWEEN 1 AND 999),
  CONSTRAINT valid_desk CHECK (desk IS NULL OR desk BETWEEN 1 AND 3),
  CONSTRAINT active_has_desk CHECK (status NOT IN ('CHAMADA','CHAMADA_NOVAMENTE','EM_ATENDIMENTO') OR desk IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS calls (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ticket_id VARCHAR(12) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  desk TINYINT UNSIGNED NOT NULL,
  called_at DATETIME(3) NOT NULL,
  repeated BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT calls_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  UNIQUE KEY unique_ticket_call (ticket_id, repeated),
  KEY calls_time (called_at),
  CONSTRAINT valid_call_desk CHECK (desk BETWEEN 1 AND 3)
) ENGINE=InnoDB;
