import mysql from "mysql2/promise"

let pool: mysql.Pool | null = null

function parseDatabaseUrl(url: string) {
  // mysql://user:pass@host:port/db
  try {
    const u = new URL(url)
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace("/", ""),
    }
  } catch {
    return null
  }
}

export function getDb() {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (url) {
      const parsed = parseDatabaseUrl(url)
      if (!parsed) throw new Error("Invalid DATABASE_URL")
      pool = mysql.createPool({
        ...parsed,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      })
    } else {
      const host = process.env.MYSQL_HOST
      const port = Number(process.env.MYSQL_PORT || "3306")
      const user = process.env.MYSQL_USER
      const password = process.env.MYSQL_PASSWORD
      const database = process.env.MYSQL_DB
      if (!host || !user || !database) {
        throw new Error("Missing MySQL env vars. Set DATABASE_URL or MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB")
      }
      pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      })
    }
  }
  return pool
}

export async function query<T = any>(sql: string, params: any[] = []) {
  const p = getDb()
  const [rows] = await p.query(sql, params)
  return rows as T
}

export async function tx<T = any>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const p = getDb()
  const conn = await p.getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
