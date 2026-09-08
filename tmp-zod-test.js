const { z } = require('zod')

const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
})

const result = loginSchema.safeParse({ email: 'invalid', password: '' })
console.log(result)
