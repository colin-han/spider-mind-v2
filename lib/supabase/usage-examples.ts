/**
 * Supabase 客户端使用示例
 * 这个文件展示了如何在不同环境中使用 Supabase 客户端
 * 注意：这个文件仅用于示例，不会被实际执行
 */

// 1. 在客户端组件中使用
/*
'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export function ClientExample() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // 获取当前用户
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return <div>User: {user?.email}</div>
}
*/

// 2. 在服务端组件中使用
/*
import { createServerComponentClient } from '@/lib/supabase/server'

export async function ServerComponentExample() {
  const supabase = await createServerComponentClient()
  
  // 获取当前用户
  const { data: { user } } = await supabase.auth.getUser()
  
  // 查询数据
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .limit(10)

  return (
    <div>
      <p>User: {user?.email}</p>
      <p>Posts count: {posts?.length}</p>
    </div>
  )
}
*/

// 3. 在 API 路由中使用
/*
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient(request)
  
  // 获取当前用户
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 查询用户数据
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  
  return Response.json(data)
}
*/

// 4. 在服务端管理员操作中使用
/*
import { createServerClient } from '@/lib/supabase/server'

export async function adminCreateUser(email: string, password: string) {
  const supabase = createServerClient()
  
  // 使用服务端权限创建用户
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  
  if (error) {
    throw error
  }
  
  return data.user
}
*/

// 5. 常用认证操作示例
/*
import { supabase } from '@/lib/supabase'

// 用户注册
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

// 用户登录
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

// 用户退出
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// 重置密码
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  
  if (error) throw error
}
*/

export {}; // 确保这是一个模块文件
