export const dynamic = 'force-static'
import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function POST() {
  try {
    const cwd = process.cwd()
    const deployScript = path.join(cwd, 'deploy.sh')

    // deploy.sh が存在する場合はそれを実行、なければビルドのみ
    const fs = await import('fs')
    const hasDeployScript = fs.existsSync(deployScript)

    const command = hasDeployScript
      ? `bash ${deployScript}`
      : 'npm run build'

    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 5 * 60 * 1000, // 5分タイムアウト
    })

    return NextResponse.json({ ok: true, log: stdout || stderr })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
