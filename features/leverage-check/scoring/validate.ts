import { z } from 'zod'

const answerLetter = z.enum(['A', 'B', 'C', 'D'])

export const leverageCheckAnswersSchema = z.object({
  q1: answerLetter,
  q2: answerLetter,
  q3: answerLetter,
  q4: answerLetter,
  q5: answerLetter,
  q6: answerLetter,
  q7: answerLetter,
  q8: answerLetter,
})
