const { useState, useRef, useEffect, createElement: e } = React;

// Іконки як SVG компоненти
const Upload = () => e('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
  e('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
  e('polyline', { points: '17 8 12 3 7 8' }),
  e('line', { x1: 12, x2: 12, y1: 3, y2: 15 })
);

const RotateCcw = () => e('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
  e('polyline', { points: '1 4 1 10 7 10' }),
  e('path', { d: 'M3.51 15a9 9 0 1 0 2.13-9.36L1 10' })
);

const Move = () => e('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
  e('polyline', { points: '5 9 2 12 5 15' }),
  e('polyline', { points: '9 5 12 2 15 5' }),
  e('polyline', { points: '15 19 12 22 9 19' }),
  e('polyline', { points: '19 9 22 12 19 15' }),
  e('line', { x1: 2, x2: 22, y1: 12, y2: 12 }),
  e('line', { x1: 12, x2: 12, y1: 2, y2: 22 })
);

const Download = () => e('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
  e('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
  e('polyline', { points: '7 10 12 15 17 10' }),
  e('line', { x1: 12, x2: 12, y1: 15, y2: 3 })
);

function PerspectiveCorrector() {
  const [image, setImage] = useState(null);
  const [corners, setCorners] = useState([]);
  const [draggingCorner, setDraggingCorner] = useState(null);
  const [result, setResult] = useState(null);
  const [outputWidth, setOutputWidth] = useState('');
  const [outputHeight, setOutputHeight] = useState('');
  const [maintainAspect, setMaintainAspect] = useState(true);
  const canvasRef = useRef(null);
  const resultCanvasRef = useRef(null);

  useEffect(() => {
    if (image && canvasRef.current) {
      drawCanvas();
    }
  }, [image, corners]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          const w = img.width;
          const h = img.height;
          const margin = Math.min(w, h) * 0.1;
          setCorners([
            { x: margin, y: margin },
            { x: w - margin, y: margin },
            { x: w - margin, y: h - margin },
            { x: margin, y: h - margin }
          ]);
          setResult(null);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!image) return;

    const maxWidth = 800;
    const scale = Math.min(maxWidth / image.width, 1);
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (corners.length === 4) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      corners.forEach((corner, i) => {
        const x = corner.x * scale;
        const y = corner.y * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();

      corners.forEach((corner, i) => {
        const x = corner.x * scale;
        const y = corner.y * scale;
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i + 1, x, y);
      });
    }
  };

  const handleCanvasClick = (event) => {
    if (!image) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;
    
    const imageScale = image.width / canvas.width;
    const actualX = x * imageScale;
    const actualY = y * imageScale;

    const clickRadius = 15;
    const clickedCornerIndex = corners.findIndex(corner => {
      const dx = corner.x - actualX;
      const dy = corner.y - actualY;
      return Math.sqrt(dx * dx + dy * dy) < clickRadius * imageScale;
    });

    if (clickedCornerIndex >= 0) {
      setDraggingCorner(clickedCornerIndex);
    }
  };

  const handleCanvasMove = (event) => {
    if (draggingCorner === null || !image) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;
    
    const imageScale = image.width / canvas.width;
    const actualX = Math.max(0, Math.min(x * imageScale, image.width));
    const actualY = Math.max(0, Math.min(y * imageScale, image.height));

    const newCorners = [...corners];
    newCorners[draggingCorner] = { x: actualX, y: actualY };
    setCorners(newCorners);
  };

  const handleCanvasUp = () => {
    setDraggingCorner(null);
  };

  const applyPerspectiveTransform = () => {
    if (!image || corners.length !== 4) return;

    const sorted = [...corners];
    sorted.sort((a, b) => a.y - b.y);
    const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
    const orderedCorners = [top[0], top[1], bottom[1], bottom[0]];

    const width1 = Math.sqrt(
      Math.pow(orderedCorners[1].x - orderedCorners[0].x, 2) +
      Math.pow(orderedCorners[1].y - orderedCorners[0].y, 2)
    );
    const width2 = Math.sqrt(
      Math.pow(orderedCorners[2].x - orderedCorners[3].x, 2) +
      Math.pow(orderedCorners[2].y - orderedCorners[3].y, 2)
    );
    const height1 = Math.sqrt(
      Math.pow(orderedCorners[3].x - orderedCorners[0].x, 2) +
      Math.pow(orderedCorners[3].y - orderedCorners[0].y, 2)
    );
    const height2 = Math.sqrt(
      Math.pow(orderedCorners[2].x - orderedCorners[1].x, 2) +
      Math.pow(orderedCorners[2].y - orderedCorners[1].y, 2)
    );

    const naturalWidth = Math.round(Math.max(width1, width2));
    const naturalHeight = Math.round(Math.max(height1, height2));

    let finalWidth, finalHeight, transformWidth, transformHeight, offsetX, offsetY;
    
    if (outputWidth && outputHeight) {
      finalWidth = parseInt(outputWidth);
      finalHeight = parseInt(outputHeight);
      
      if (maintainAspect) {
        const aspectRatio = naturalWidth / naturalHeight;
        const targetAspect = finalWidth / finalHeight;
        
        if (aspectRatio > targetAspect) {
          transformWidth = finalWidth;
          transformHeight = Math.round(finalWidth / aspectRatio);
        } else {
          transformHeight = finalHeight;
          transformWidth = Math.round(finalHeight * aspectRatio);
        }
        
        offsetX = Math.round((finalWidth - transformWidth) / 2);
        offsetY = Math.round((finalHeight - transformHeight) / 2);
      } else {
        transformWidth = finalWidth;
        transformHeight = finalHeight;
        offsetX = 0;
        offsetY = 0;
      }
    } else {
      finalWidth = naturalWidth;
      finalHeight = naturalHeight;
      transformWidth = naturalWidth;
      transformHeight = naturalHeight;
      offsetX = 0;
      offsetY = 0;
    }

    const resultCanvas = resultCanvasRef.current;
    resultCanvas.width = finalWidth;
    resultCanvas.height = finalHeight;
    const ctx = resultCanvas.getContext('2d');
    
    ctx.clearRect(0, 0, finalWidth, finalHeight);

    transformImage(image, ctx, transformWidth, transformHeight, orderedCorners, offsetX, offsetY);

    setResult(resultCanvas.toDataURL('image/png'));
  };

  const transformImage = (img, ctx, width, height, srcCorners, offsetX, offsetY) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, img.width, img.height);

    const resultData = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcPoint = mapPoint(x, y, width, height, srcCorners);
        
        if (srcPoint.x >= 0 && srcPoint.x < img.width && 
            srcPoint.y >= 0 && srcPoint.y < img.height) {
          const srcX = Math.floor(srcPoint.x);
          const srcY = Math.floor(srcPoint.y);
          const srcIdx = (srcY * img.width + srcX) * 4;
          const dstIdx = (y * width + x) * 4;

          resultData.data[dstIdx] = imageData.data[srcIdx];
          resultData.data[dstIdx + 1] = imageData.data[srcIdx + 1];
          resultData.data[dstIdx + 2] = imageData.data[srcIdx + 2];
          resultData.data[dstIdx + 3] = imageData.data[srcIdx + 3];
        }
      }
    }

    ctx.putImageData(resultData, offsetX, offsetY);
  };

  const mapPoint = (x, y, width, height, srcCorners) => {
    const u = x / width;
    const v = y / height;

    const top = {
      x: srcCorners[0].x * (1 - u) + srcCorners[1].x * u,
      y: srcCorners[0].y * (1 - u) + srcCorners[1].y * u
    };
    const bottom = {
      x: srcCorners[3].x * (1 - u) + srcCorners[2].x * u,
      y: srcCorners[3].y * (1 - u) + srcCorners[2].y * u
    };

    return {
      x: top.x * (1 - v) + bottom.x * v,
      y: top.y * (1 - v) + bottom.y * v
    };
  };

  const downloadResult = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.download = 'corrected-image.png';
    link.href = result;
    link.click();
  };

  const reset = () => {
    if (image) {
      const w = image.width;
      const h = image.height;
      const margin = Math.min(w, h) * 0.1;
      setCorners([
        { x: margin, y: margin },
        { x: w - margin, y: margin },
        { x: w - margin, y: h - margin },
        { x: margin, y: h - margin }
      ]);
      setResult(null);
    }
  };

  return e('div', { className: 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8' },
    e('div', { className: 'max-w-6xl mx-auto' },
      e('h1', { className: 'text-4xl font-bold text-gray-800 mb-2 text-center' }, 'Виправлення перспективи'),
      e('p', { className: 'text-gray-600 mb-8 text-center' }, 'Завантажте фото та перетягніть кути для виправлення викривлення'),
      
      e('div', { className: 'bg-white rounded-xl shadow-lg p-6 mb-6' },
        e('div', { className: 'flex flex-wrap gap-4 mb-6' },
          e('label', { className: 'flex-1 min-w-[200px]' },
            e('div', { className: 'flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg cursor-pointer transition' },
              e(Upload),
              e('span', null, 'Завантажити фото')
            ),
            e('input', {
              type: 'file',
              accept: 'image/*',
              onChange: handleImageUpload,
              className: 'hidden'
            })
          ),
          
          image && e('button', {
            onClick: reset,
            className: 'flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition'
          }, e(RotateCcw), e('span', null, 'Скинути')),
          
          image && e('button', {
            onClick: applyPerspectiveTransform,
            className: 'flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition'
          }, e(Move), e('span', null, 'Виправити перспективу')),
          
          result && e('button', {
            onClick: downloadResult,
            className: 'flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg transition'
          }, e(Download), e('span', null, 'Зберегти'))
        ),
        
        image && e('div', null,
          e('div', { className: 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6' },
            e('p', { className: 'text-sm text-blue-800' },
              e('strong', null, 'Інструкція: '),
              'Перетягніть сині точки на кути об\'єкта, який потрібно випрямити. Точки пронумеровані 1-4 за годинниковою стрілкою, починаючи з верхнього лівого кута.'
            )
          ),
          
          e('div', { className: 'bg-white border border-gray-200 rounded-lg p-4 mb-6' },
            e('h3', { className: 'font-semibold text-gray-700 mb-3' }, 'Налаштування розміру результату'),
            e('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4 items-end' },
              e('div', null,
                e('label', { className: 'block text-sm text-gray-600 mb-1' }, 'Ширина (px)'),
                e('input', {
                  type: 'number',
                  value: outputWidth,
                  onChange: (ev) => setOutputWidth(ev.target.value),
                  placeholder: 'Авто',
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                })
              ),
              e('div', null,
                e('label', { className: 'block text-sm text-gray-600 mb-1' }, 'Висота (px)'),
                e('input', {
                  type: 'number',
                  value: outputHeight,
                  onChange: (ev) => setOutputHeight(ev.target.value),
                  placeholder: 'Авто',
                  className: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                })
              ),
              e('div', null,
                e('label', { className: 'flex items-center gap-2 cursor-pointer' },
                  e('input', {
                    type: 'checkbox',
                    checked: maintainAspect,
                    onChange: (ev) => setMaintainAspect(ev.target.checked),
                    className: 'w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500'
                  }),
                  e('span', { className: 'text-sm text-gray-700' }, 'Зберегти пропорції')
                )
              )
            ),
            e('p', { className: 'text-xs text-gray-500 mt-2' },
              'Залиште поля порожніми для автоматичного розміру. Якщо пропорції збережено, зображення вписується в заданий розмір з прозорим фоном.'
            )
          )
        ),
        
        e('div', { className: 'grid md:grid-cols-2 gap-6' },
          image && e('div', null,
            e('h3', { className: 'font-semibold text-gray-700 mb-3' }, 'Оригінал (перетягніть точки)'),
            e('div', { className: 'border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100' },
              e('canvas', {
                ref: canvasRef,
                onMouseDown: handleCanvasClick,
                onMouseMove: handleCanvasMove,
                onMouseUp: handleCanvasUp,
                onMouseLeave: handleCanvasUp,
                className: 'w-full cursor-crosshair'
              })
            )
          ),
          
          result && e('div', null,
            e('h3', { className: 'font-semibold text-gray-700 mb-3' }, 'Виправлений результат'),
            e('div', { 
              className: 'border-2 border-green-300 rounded-lg overflow-hidden bg-gray-100',
              style: {
                backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 50% / 20px 20px'
              }
            },
              e('img', { src: result, alt: 'Result', className: 'w-full' })
            )
          )
        ),
        
        e('canvas', { ref: resultCanvasRef, className: 'hidden' })
      ),
      
      e('div', { className: 'bg-white rounded-xl shadow-lg p-6' },
        e('h3', { className: 'font-semibold text-gray-700 mb-3' }, 'Поради для кращого результату:'),
        e('ul', { className: 'space-y-2 text-gray-600' },
          e('li', null, '• Фотографуйте в добре освітленому місці'),
          e('li', null, '• Контрастний фон полегшить автоматичне виявлення'),
          e('li', null, '• Перетягуйте точки якомога точніше на кути об\'єкта'),
          e('li', null, '• Для карток та ігрових полів намагайтеся тримати камеру максимально паралельно поверхні')
        )
      )
    )
  );
}

ReactDOM.render(e(PerspectiveCorrector), document.getElementById('root'));
