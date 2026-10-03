process.env.RUN_MYSQL_TESTS = "1";
await import("../test/mysql.integration.js");
