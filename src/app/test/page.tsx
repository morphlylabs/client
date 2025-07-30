"use client";

import { useState } from 'react';

export default function TestPage() {
  const [currentExample, setCurrentExample] = useState('cube');

  const examples = {
    cube: {
      name: 'Simple Cube',
      code: `function main() {
  const myCube = cube({ size: 10 });
  return myCube;
}`,
      description: 'Basic 10x10x10 cube - should be a perfect cube'
    },
    sphere: {
      name: 'Sphere',
      code: `function main() {
  const mySphere = sphere({ radius: 5 });
  return mySphere;
}`,
      description: 'Sphere with radius 5 - should be perfectly round'
    },
    cylinder: {
      name: 'Cylinder',
      code: `function main() {
  const myCylinder = cylinder({ radius: 3, height: 10 });
  return myCylinder;
}`,
      description: 'Cylinder with radius 3 and height 10 - should be a tube'
    },
    complex: {
      name: 'Complex Shape',
      code: `function main() {
  const base = cube({ size: 10 });
  const hole = cylinder({ radius: 2, height: 12 });
  const result = subtract(base, hole);
  return result;
}`,
      description: 'Cube with a cylindrical hole through it - tests boolean operations'
    },
    torus: {
      name: 'Torus (Donut)',
      code: `function main() {
  const myTorus = torus({ innerRadius: 2, outerRadius: 5 });
  return myTorus;
}`,
      description: 'Torus with inner radius 2 and outer radius 5 - should look like a donut'
    }
  };

  const setExample = (exampleKey: string) => {
    const example = examples[exampleKey as keyof typeof examples];
    if (example) {
      const textarea = document.getElementById('jscadCode') as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = example.code;
      }
      setCurrentExample(exampleKey);
    }
  };

  const generateSTL = async () => {
    const code = (document.getElementById('jscadCode') as HTMLTextAreaElement).value;
    const resultDiv = document.getElementById('result');
    
    if (!resultDiv) return;
    
    resultDiv.innerHTML = '🔄 Generating STL...';
    resultDiv.className = 'result';
    
    try {
      const response = await fetch('/api/stl/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: code })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        resultDiv.innerHTML = `
          ✅ Success! STL file generated (${blob.size} bytes)
          <br><br>
          <a href="${url}" download="model.stl" style="background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
            📥 Download STL File
          </a>
        `;
        resultDiv.className = 'result success';
      } else {
        const error = await response.json();
        resultDiv.innerHTML = `❌ Error: ${error.error || 'Unknown error'}`;
        resultDiv.className = 'result error';
      }
    } catch (error) {
      resultDiv.innerHTML = `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      resultDiv.className = 'result error';
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1>🧪 JSCAD to STL Test</h1>
        
        <p>Paste your JSCAD code below and click "Generate STL" to test:</p>
        
        <textarea 
          id="jscadCode" 
          placeholder="Paste your JSCAD code here..."
          style={{ width: '100%', height: '200px', fontFamily: 'monospace' }}
          defaultValue={`function main() {
  const myCube = cube({ size: 10 });
  return myCube;
}`}
        />
        
        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <h3>Test Examples:</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setExample('cube')}
              style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🧊 Cube
            </button>
            <button 
              onClick={() => setExample('sphere')}
              style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🔵 Sphere
            </button>
            <button 
              onClick={() => setExample('cylinder')}
              style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🏗️ Cylinder
            </button>
            <button 
              onClick={() => setExample('complex')}
              style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🔧 Complex
            </button>
            <button 
              onClick={() => setExample('torus')}
              style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🍩 Torus
            </button>
          </div>
        </div>
        
        <br />
        <button 
          onClick={generateSTL}
          style={{ 
            padding: '10px 20px', 
            margin: '10px 0', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            cursor: 'pointer' 
          }}
        >
          Generate STL
        </button>
        
        <div id="result" />
        
        {examples[currentExample as keyof typeof examples] && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
            <h4>Current Example: {examples[currentExample as keyof typeof examples].name}</h4>
            <p style={{ margin: '0', color: '#6c757d' }}>
              {examples[currentExample as keyof typeof examples].description}
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .result {
          margin-top: 20px;
          padding: 10px;
          border-radius: 5px;
        }
        .success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        button:hover {
          background: #0056b3;
        }
      `}</style>
    </div>
  );
} 