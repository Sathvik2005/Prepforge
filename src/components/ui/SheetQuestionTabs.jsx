import React, { useState } from 'react';

const SheetQuestionTabs = ({ question }) => {
  const [tab, setTab] = useState(0);

  if (!question) return <div>No question data.</div>;

  const tabs = ['Question', 'Test Cases', 'Solution'];

  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl p-6 shadow-soft-md">
      <div className="flex border-b border-surface-200 dark:border-surface-600 mb-4">
        {tabs.map((tabName, index) => (
          <button
            key={index}
            onClick={() => setTab(index)}
            className={`px-6 py-3 font-semibold transition-all relative ${
              tab === index
                ? 'text-royal-600 dark:text-royal-400'
                : 'text-surface-600 dark:text-surface-400 hover:text-navy-900 dark:hover:text-white'
            }`}
          >
            {tabName}
            {tab === index && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-royal-600 dark:bg-royal-400"></div>
            )}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === 0 && (
          <div>
            <h2 className="text-xl font-bold mb-2">{question.title}</h2>
            <p className="mb-2">{question.description}</p>
            <div className="text-sm text-surface-500 mb-2">Topic: {question.topic} | Difficulty: {question.difficulty}</div>
            {question.hints && question.hints.length > 0 && (
              <div className="mt-2">
                <b>Hints:</b>
                <ul className="list-disc ml-6">
                  {question.hints.map((hint, i) => <li key={i}>{hint}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
        {tab === 1 && (
          <div>
            <h3 className="font-semibold mb-2">Test Cases</h3>
            {question.testCases && question.testCases.length > 0 ? (
              <ul className="list-decimal ml-6">
                {question.testCases.map((tc, i) => (
                  <li key={i} className="mb-2">
                    <div><b>Input:</b> <pre className="inline">{tc.input}</pre></div>
                    <div><b>Output:</b> <pre className="inline">{tc.output}</pre></div>
                  </li>
                ))}
              </ul>
            ) : (
              <div>No test cases available.</div>
            )}
          </div>
        )}
        {tab === 2 && (
          <div>
            <h3 className="font-semibold mb-2">Solution</h3>
            {question.explanation ? (
              <pre className="bg-surface-100 dark:bg-surface-700 p-4 rounded text-sm overflow-x-auto">{question.explanation}</pre>
            ) : (
              <div>No solution/explanation available.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SheetQuestionTabs;
