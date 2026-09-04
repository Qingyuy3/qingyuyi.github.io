'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, RotateCcw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { quizQuestions } from '@/data/course';

export function InteractiveQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [finished, setFinished] = useState(false);
  const current = quizQuestions[step];
  const selected = answers[step];
  const isCorrect = selected === current.answer;
  const score = quizQuestions.reduce((total, question, index) => total + (answers[index] === question.answer ? 1 : 0), 0);

  function reset() {
    setStep(0); setAnswers({}); setChecked({}); setFinished(false);
  }

  if (finished) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/45">
        <CardContent className="flex min-h-80 flex-col items-center justify-center text-center">
          <div className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-8" /></div>
          <p className="mt-5 text-sm text-muted-foreground">本次得分</p>
          <p className="mt-1 text-4xl font-semibold text-emerald-800">{score} / {quizQuestions.length}</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{score >= 5 ? '掌握得很好，可以开始数据与爬虫实践了。' : '建议回看对应单元课件和配套数据后再次尝试。'}</p>
          <Button onClick={reset} variant="outline" className="mt-6"><RotateCcw />重新作答</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>智能商务分析与实践 · 课程概念检查</CardTitle>
        <CardDescription>6 道单选题，覆盖 Pandas、集成学习与网络爬虫，提交后显示中英文术语解释。</CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={((step + 1) / quizQuestions.length) * 100} className="mb-7"><ProgressLabel>第 {step + 1} 题</ProgressLabel><ProgressValue>{() => `${step + 1} / ${quizQuestions.length}`}</ProgressValue></Progress>
        <h3 className="text-base font-semibold leading-7">{current.question}</h3>
        <RadioGroup value={selected === undefined ? '' : String(selected)} onValueChange={(value) => { if (!checked[step]) setAnswers((old) => ({ ...old, [step]: Number(value) })); }} className="mt-5">
          {current.options.map((option, index) => {
            const reveal = checked[step];
            const optionCorrect = index === current.answer;
            const optionSelected = index === selected;
            return (
              <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${reveal && optionCorrect ? 'border-emerald-300 bg-emerald-50' : reveal && optionSelected ? 'border-red-200 bg-red-50' : 'border-border hover:bg-secondary/60'}`}>
                <RadioGroupItem value={String(index)} disabled={reveal} />
                <span className="flex-1">{option}</span>
                {reveal && optionCorrect && <CheckCircle2 className="size-4 text-emerald-600" />}
                {reveal && optionSelected && !optionCorrect && <XCircle className="size-4 text-red-500" />}
              </label>
            );
          })}
        </RadioGroup>

        {checked[step] && <div className={`mt-5 rounded-xl p-4 text-sm leading-6 ${isCorrect ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}><strong>{isCorrect ? '回答正确。' : '再想一想。'}</strong> {current.explanation}</div>}

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ChevronLeft />上一题</Button>
          {!checked[step] ? (
            <Button disabled={selected === undefined} onClick={() => setChecked((old) => ({ ...old, [step]: true }))}>提交答案</Button>
          ) : step < quizQuestions.length - 1 ? (
            <Button onClick={() => setStep((value) => value + 1)}>下一题<ChevronRight /></Button>
          ) : <Button onClick={() => setFinished(true)}>查看得分<CheckCircle2 /></Button>}
        </div>
      </CardContent>
    </Card>
  );
}
