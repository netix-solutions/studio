'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Transformer, Group, Circle, Line, Star, RegularPolygon, Ellipse } from 'react-konva';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Type,
  ImageIcon,
  Trash2,
  Download,
  RotateCcw,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Layers,
  ChevronUp,
  ChevronDown,
  Copy,
  Palette,
  Upload,
  Move,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Save,
  Loader2,
  Square,
  Circle as CircleIcon,
  Triangle,
  Star as StarIcon,
  Minus,
  Pentagon,
  Hexagon,
  Heart,
  Diamond,
} from 'lucide-react';
import Konva from 'konva';
import { AD_DIMENSIONS } from '@/lib/types';

// Gradient types
export interface GradientStop {
  offset: number; // 0-1
  color: string;
}

export interface LinearGradient {
  type: 'linear';
  angle: number; // 0-360 degrees
  stops: GradientStop[];
}

export interface RadialGradient {
  type: 'radial';
  stops: GradientStop[];
}

export type GradientFill = LinearGradient | RadialGradient;

// Shape types
export type ShapeType = 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'star' | 'pentagon' | 'hexagon' | 'diamond' | 'heart' | 'line' | 'arrow';

// Types for canvas elements
interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

interface TextElement extends CanvasElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  fill: string;
  align: 'left' | 'center' | 'right';
  width: number;
}

interface ImageElement extends CanvasElement {
  type: 'image';
  src: string;
  imageObj?: HTMLImageElement;
}

interface ShapeElement extends CanvasElement {
  type: 'shape';
  shapeType: ShapeType;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  gradient?: GradientFill;
  opacity?: number;
  cornerRadius?: number;
  // Star-specific
  numPoints?: number;
  innerRadius?: number;
  outerRadius?: number;
  // Line-specific
  points?: number[];
}

type DesignElement = TextElement | ImageElement | ShapeElement;

// Available fonts
const FONTS = [
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Georgia', label: 'Georgia (Classic)' },
  { value: 'Arial Black', label: 'Arial Black (Bold)' },
  { value: 'Playfair Display', label: 'Playfair Display (Elegant)' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
];

// Default colors palette
const COLOR_PALETTE = [
  '#000000', '#FFFFFF', '#1F2937', '#374151', '#6B7280',
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E',
];

// Extended color palette for backgrounds/shapes
const EXTENDED_COLOR_PALETTE = [
  // Grays
  '#000000', '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6', '#FFFFFF',
  // Warm colors
  '#7F1D1D', '#991B1B', '#B91C1C', '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2', '#FEF2F2',
  '#7C2D12', '#9A3412', '#C2410C', '#EA580C', '#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FFEDD5', '#FFF7ED',
  '#78350F', '#92400E', '#B45309', '#D97706', '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7', '#FFFBEB',
  // Cool colors
  '#14532D', '#166534', '#15803D', '#16A34A', '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#DCFCE7', '#F0FDF4',
  '#134E4A', '#115E59', '#0F766E', '#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4', '#CCFBF1', '#F0FDFA',
  '#164E63', '#155E75', '#0E7490', '#0891B2', '#06B6D4', '#22D3EE', '#67E8F9', '#A5F3FC', '#CFFAFE', '#ECFEFF',
  '#1E3A8A', '#1E40AF', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF',
  '#312E81', '#3730A3', '#4338CA', '#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE', '#E0E7FF', '#EEF2FF',
  '#4C1D95', '#5B21B6', '#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F5F3FF',
  '#701A75', '#86198F', '#A21CAF', '#C026D3', '#D946EF', '#E879F9', '#F0ABFC', '#F5D0FE', '#FAE8FF', '#FDF4FF',
  '#831843', '#9D174D', '#BE185D', '#DB2777', '#EC4899', '#F472B6', '#F9A8D4', '#FBCFE8', '#FCE7F3', '#FDF2F8',
];

// Gradient presets
const GRADIENT_PRESETS: { name: string; gradient: GradientFill }[] = [
  // Linear gradients - vibrant
  { name: 'Sunset', gradient: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#F97316' }, { offset: 1, color: '#EC4899' }] } },
  { name: 'Ocean', gradient: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#06B6D4' }, { offset: 1, color: '#3B82F6' }] } },
  { name: 'Forest', gradient: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#22C55E' }, { offset: 1, color: '#14B8A6' }] } },
  { name: 'Berry', gradient: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#8B5CF6' }, { offset: 1, color: '#EC4899' }] } },
  { name: 'Fire', gradient: { type: 'linear', angle: 180, stops: [{ offset: 0, color: '#EF4444' }, { offset: 0.5, color: '#F97316' }, { offset: 1, color: '#EAB308' }] } },
  { name: 'Aurora', gradient: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#22C55E' }, { offset: 0.5, color: '#06B6D4' }, { offset: 1, color: '#8B5CF6' }] } },
  { name: 'Midnight', gradient: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#1E3A8A' }, { offset: 1, color: '#6366F1' }] } },
  { name: 'Gold', gradient: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#F59E0B' }, { offset: 1, color: '#B45309' }] } },
  // Radial gradients
  { name: 'Spotlight', gradient: { type: 'radial', stops: [{ offset: 0, color: '#FFFFFF' }, { offset: 1, color: '#E5E7EB' }] } },
  { name: 'Glow Blue', gradient: { type: 'radial', stops: [{ offset: 0, color: '#60A5FA' }, { offset: 1, color: '#1E40AF' }] } },
  { name: 'Glow Pink', gradient: { type: 'radial', stops: [{ offset: 0, color: '#F472B6' }, { offset: 1, color: '#831843' }] } },
  { name: 'Glow Green', gradient: { type: 'radial', stops: [{ offset: 0, color: '#4ADE80' }, { offset: 1, color: '#166534' }] } },
  // Subtle gradients
  { name: 'Silver', gradient: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#F3F4F6' }, { offset: 1, color: '#9CA3AF' }] } },
  { name: 'Slate', gradient: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#475569' }, { offset: 1, color: '#1E293B' }] } },
  { name: 'Pearl', gradient: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#FAFAFA' }, { offset: 0.5, color: '#F5F5F5' }, { offset: 1, color: '#E5E5E5' }] } },
  { name: 'Royal', gradient: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#4338CA' }, { offset: 1, color: '#1E1B4B' }] } },
];

// Shape configurations
const SHAPE_CONFIGS: { type: ShapeType; icon: React.ReactNode; label: string }[] = [
  { type: 'rectangle', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
  { type: 'circle', icon: <CircleIcon className="h-4 w-4" />, label: 'Circle' },
  { type: 'ellipse', icon: <CircleIcon className="h-4 w-4 scale-x-125" />, label: 'Ellipse' },
  { type: 'triangle', icon: <Triangle className="h-4 w-4" />, label: 'Triangle' },
  { type: 'star', icon: <StarIcon className="h-4 w-4" />, label: 'Star' },
  { type: 'pentagon', icon: <Pentagon className="h-4 w-4" />, label: 'Pentagon' },
  { type: 'hexagon', icon: <Hexagon className="h-4 w-4" />, label: 'Hexagon' },
  { type: 'diamond', icon: <Diamond className="h-4 w-4" />, label: 'Diamond' },
  { type: 'line', icon: <Minus className="h-4 w-4" />, label: 'Line' },
];

// Helper to convert gradient to Konva fill
function getKonvaFillFromGradient(gradient: GradientFill, width: number, height: number): object {
  if (gradient.type === 'linear') {
    const angleRad = (gradient.angle * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const centerX = width / 2;
    const centerY = height / 2;
    const length = Math.sqrt(width * width + height * height) / 2;

    return {
      fillLinearGradientStartPoint: { x: centerX - cos * length, y: centerY - sin * length },
      fillLinearGradientEndPoint: { x: centerX + cos * length, y: centerY + sin * length },
      fillLinearGradientColorStops: gradient.stops.flatMap(s => [s.offset, s.color]),
    };
  } else {
    return {
      fillRadialGradientStartPoint: { x: width / 2, y: height / 2 },
      fillRadialGradientEndPoint: { x: width / 2, y: height / 2 },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndRadius: Math.max(width, height) / 2,
      fillRadialGradientColorStops: gradient.stops.flatMap(s => [s.offset, s.color]),
    };
  }
}

// Generate gradient CSS for preview
function getGradientCSS(gradient: GradientFill): string {
  const colorStops = gradient.stops.map(s => `${s.color} ${s.offset * 100}%`).join(', ');
  if (gradient.type === 'linear') {
    return `linear-gradient(${gradient.angle}deg, ${colorStops})`;
  }
  return `radial-gradient(circle, ${colorStops})`;
}

interface AdDesignerProps {
  width?: number;
  height?: number;
  initialElements?: DesignElement[];
  initialBackgroundColor?: string;
  onSave?: (imageDataUrl: string, elements: DesignElement[], backgroundColor: string) => void;
  onExport?: (imageDataUrl: string) => void;
  isSaving?: boolean;
}

// History state for undo/redo
interface HistoryState {
  elements: DesignElement[];
  backgroundColor: string;
}

export default function AdDesigner({
  width = AD_DIMENSIONS.WIDTH,
  height = AD_DIMENSIONS.HEIGHT,
  initialElements = [],
  initialBackgroundColor = '#FFFFFF',
  onSave,
  onExport,
  isSaving = false,
}: AdDesignerProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const [elements, setElements] = useState<DesignElement[]>(initialElements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);

  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([{ elements: initialElements, backgroundColor: initialBackgroundColor }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Zoom
  const [scale, setScale] = useState(1);

  // Get selected element
  const selectedElement = elements.find(el => el.id === selectedId);

  // Save history state
  const saveToHistory = useCallback((newElements: DesignElement[], newBgColor: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ elements: newElements, backgroundColor: newBgColor });
    // Keep only last 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex].elements);
      setBackgroundColor(history[newIndex].backgroundColor);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(history[newIndex].elements);
      setBackgroundColor(history[newIndex].backgroundColor);
    }
  }, [history, historyIndex]);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      const transformer = transformerRef.current;

      if (selectedId) {
        const selectedNode = stage.findOne(`#${selectedId}`);
        if (selectedNode) {
          transformer.nodes([selectedNode]);
          transformer.getLayer()?.batchDraw();
        }
      } else {
        transformer.nodes([]);
        transformer.getLayer()?.batchDraw();
      }
    }
  }, [selectedId, elements]);

  // Auto-focus text input when a text element is selected
  useEffect(() => {
    if (selectedElement?.type === 'text' && textInputRef.current) {
      // Small delay to ensure the panel is rendered
      setTimeout(() => {
        textInputRef.current?.focus();
        textInputRef.current?.select();
      }, 50);
    }
  }, [selectedId]);

  // Generate unique ID
  const generateId = () => `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add text element
  const addText = () => {
    const newText: TextElement = {
      id: generateId(),
      type: 'text',
      x: width / 2 - 100,
      y: height / 2 - 20,
      text: 'Double-click to edit',
      fontSize: 24,
      fontFamily: 'Inter',
      fontStyle: 'normal',
      fill: '#1F2937',
      align: 'center',
      width: 200,
    };
    const newElements = [...elements, newText];
    setElements(newElements);
    setSelectedId(newText.id);
    saveToHistory(newElements, backgroundColor);
  };

  // Add shape element
  const addShape = (shapeType: ShapeType) => {
    const defaultSize = shapeType === 'line' ? { width: 100, height: 4 } : { width: 80, height: 80 };

    const newShape: ShapeElement = {
      id: generateId(),
      type: 'shape',
      shapeType,
      x: width / 2 - defaultSize.width / 2,
      y: height / 2 - defaultSize.height / 2,
      width: defaultSize.width,
      height: defaultSize.height,
      fill: '#3B82F6',
      stroke: undefined,
      strokeWidth: 0,
      opacity: 1,
      cornerRadius: shapeType === 'rectangle' ? 0 : undefined,
      numPoints: shapeType === 'star' ? 5 : undefined,
      innerRadius: shapeType === 'star' ? 20 : undefined,
      outerRadius: shapeType === 'star' ? 40 : undefined,
    };

    const newElements = [...elements, newShape];
    setElements(newElements);
    setSelectedId(newShape.id);
    saveToHistory(newElements, backgroundColor);
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.src = reader.result as string;
      img.onload = () => {
        // Calculate size to fit within canvas while maintaining aspect ratio
        let imgWidth = img.width;
        let imgHeight = img.height;
        const maxWidth = width * 0.4;
        const maxHeight = height * 0.6;

        if (imgWidth > maxWidth) {
          const ratio = maxWidth / imgWidth;
          imgWidth = maxWidth;
          imgHeight = imgHeight * ratio;
        }
        if (imgHeight > maxHeight) {
          const ratio = maxHeight / imgHeight;
          imgHeight = maxHeight;
          imgWidth = imgWidth * ratio;
        }

        const newImage: ImageElement = {
          id: generateId(),
          type: 'image',
          x: 20,
          y: (height - imgHeight) / 2,
          width: imgWidth,
          height: imgHeight,
          src: reader.result as string,
          imageObj: img,
        };
        const newElements = [...elements, newImage];
        setElements(newElements);
        setSelectedId(newImage.id);
        saveToHistory(newElements, backgroundColor);
      };
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update element
  const updateElement = (id: string, updates: Partial<DesignElement>) => {
    const newElements = elements.map(el =>
      el.id === id ? { ...el, ...updates } as DesignElement : el
    );
    setElements(newElements);
  };

  // Update element with history
  const updateElementWithHistory = (id: string, updates: Partial<DesignElement>) => {
    const newElements = elements.map(el =>
      el.id === id ? { ...el, ...updates } as DesignElement : el
    );
    setElements(newElements);
    saveToHistory(newElements, backgroundColor);
  };

  // Delete selected element
  const deleteSelected = () => {
    if (!selectedId) return;
    const newElements = elements.filter(el => el.id !== selectedId);
    setElements(newElements);
    setSelectedId(null);
    saveToHistory(newElements, backgroundColor);
  };

  // Duplicate selected element
  const duplicateSelected = () => {
    if (!selectedElement) return;
    const newElement = {
      ...selectedElement,
      id: generateId(),
      x: selectedElement.x + 20,
      y: selectedElement.y + 20,
    };
    if (newElement.type === 'image' && 'imageObj' in selectedElement) {
      (newElement as ImageElement).imageObj = selectedElement.imageObj;
    }
    const newElements = [...elements, newElement];
    setElements(newElements);
    setSelectedId(newElement.id);
    saveToHistory(newElements, backgroundColor);
  };

  // Move layer
  const moveLayer = (direction: 'up' | 'down') => {
    if (!selectedId) return;
    const index = elements.findIndex(el => el.id === selectedId);
    if (index === -1) return;

    const newElements = [...elements];
    if (direction === 'up' && index < elements.length - 1) {
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
    } else if (direction === 'down' && index > 0) {
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
    }
    setElements(newElements);
    saveToHistory(newElements, backgroundColor);
  };

  // Handle stage click for deselection
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  };

  // Handle drag end
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    updateElementWithHistory(id, {
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  // Handle transform end
  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, id: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const element = elements.find(el => el.id === id);
    if (!element) return;

    if (element.type === 'text') {
      // For text, reset scale and adjust width/fontSize
      node.scaleX(1);
      node.scaleY(1);
      updateElementWithHistory(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(20, (element.width || 200) * scaleX),
        fontSize: Math.max(8, (element as TextElement).fontSize * scaleY),
        rotation: node.rotation(),
      });
    } else {
      // For images, keep scale values
      updateElementWithHistory(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(20, (element.width || 100) * scaleX),
        height: Math.max(20, (element.height || 100) * scaleY),
        rotation: node.rotation(),
        scaleX: 1,
        scaleY: 1,
      });
      node.scaleX(1);
      node.scaleY(1);
    }
  };

  // Handle text double-click for editing
  const handleTextDblClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, id: string) => {
    const textNode = e.target as Konva.Text;
    const stage = stageRef.current;
    if (!stage) return;

    const element = elements.find(el => el.id === id) as TextElement;
    if (!element) return;

    // Hide text node temporarily
    textNode.hide();
    transformerRef.current?.hide();

    // Create textarea over canvas
    const stageContainer = stage.container();
    const stageRect = stageContainer.getBoundingClientRect();
    const textPosition = textNode.absolutePosition();

    const textarea = document.createElement('textarea');
    stageContainer.appendChild(textarea);

    textarea.value = element.text;
    textarea.style.position = 'absolute';
    textarea.style.top = `${textPosition.y * scale}px`;
    textarea.style.left = `${textPosition.x * scale}px`;
    textarea.style.width = `${(element.width || 200) * scale}px`;
    textarea.style.height = 'auto';
    textarea.style.fontSize = `${element.fontSize * scale}px`;
    textarea.style.fontFamily = element.fontFamily;
    textarea.style.color = element.fill;
    textarea.style.border = '2px solid #3B82F6';
    textarea.style.padding = '4px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'white';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = '1.2';
    textarea.style.textAlign = element.align;
    textarea.style.transformOrigin = 'left top';
    textarea.style.zIndex = '1000';

    textarea.focus();
    textarea.select();

    const removeTextarea = () => {
      textarea.remove();
      textNode.show();
      transformerRef.current?.show();
      transformerRef.current?.forceUpdate();
    };

    textarea.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' && !evt.shiftKey) {
        updateElementWithHistory(id, { text: textarea.value });
        removeTextarea();
      }
      if (evt.key === 'Escape') {
        removeTextarea();
      }
    });

    textarea.addEventListener('blur', () => {
      updateElementWithHistory(id, { text: textarea.value });
      removeTextarea();
    });
  };

  // Export to PNG
  const exportToPNG = () => {
    if (!stageRef.current) return;

    // Temporarily deselect to hide transformer
    const prevSelected = selectedId;
    setSelectedId(null);

    setTimeout(() => {
      if (!stageRef.current) return;

      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: 2, // Higher quality
        mimeType: 'image/png',
      });

      if (onExport) {
        onExport(dataUrl);
      } else {
        // Download directly
        const link = document.createElement('a');
        link.download = `ad-design-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }

      // Restore selection
      setSelectedId(prevSelected);
    }, 100);
  };

  // Handle save
  const handleSave = () => {
    if (!stageRef.current || !onSave) return;

    // Temporarily deselect to hide transformer
    const prevSelected = selectedId;
    setSelectedId(null);

    setTimeout(() => {
      if (!stageRef.current) return;

      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: 2,
        mimeType: 'image/png',
      });

      onSave(dataUrl, elements, backgroundColor);

      // Restore selection
      setSelectedId(prevSelected);
    }, 100);
  };

  // Update background color with history
  const updateBackgroundColor = (color: string) => {
    setBackgroundColor(color);
    saveToHistory(elements, color);
  };

  // Render shape element
  const renderShape = (element: ShapeElement) => {
    const commonProps = {
      key: element.id,
      id: element.id,
      x: element.x,
      y: element.y,
      rotation: element.rotation || 0,
      opacity: element.opacity ?? 1,
      draggable: true,
      onClick: () => setSelectedId(element.id),
      onTap: () => setSelectedId(element.id),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(e, element.id),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(e, element.id),
    };

    // Get fill properties (gradient or solid)
    const getFillProps = () => {
      if (element.gradient) {
        return getKonvaFillFromGradient(element.gradient, element.width, element.height);
      }
      return { fill: element.fill };
    };

    const strokeProps = element.stroke ? { stroke: element.stroke, strokeWidth: element.strokeWidth || 2 } : {};

    switch (element.shapeType) {
      case 'rectangle':
        return (
          <Rect
            {...commonProps}
            width={element.width}
            height={element.height}
            cornerRadius={element.cornerRadius || 0}
            {...getFillProps()}
            {...strokeProps}
          />
        );
      case 'circle':
        return (
          <Circle
            {...commonProps}
            x={element.x + element.width / 2}
            y={element.y + element.height / 2}
            radius={Math.min(element.width, element.height) / 2}
            {...getFillProps()}
            {...strokeProps}
          />
        );
      case 'ellipse':
        return (
          <Ellipse
            {...commonProps}
            x={element.x + element.width / 2}
            y={element.y + element.height / 2}
            radiusX={element.width / 2}
            radiusY={element.height / 2}
            {...getFillProps()}
            {...strokeProps}
          />
        );
      case 'triangle':
        return (
          <RegularPolygon
            {...commonProps}
            x={element.x + element.width / 2}
            y={element.y + element.height / 2}
            sides={3}
            radius={Math.min(element.width, element.height) / 2}
            {...getFillProps()}
            {...strokeProps}
          />
        );
      case 'pentagon':
        return (
          <RegularPolygon
            {...commonProps}
            x={element.x + element.width / 2}
            y={element.y + element.height / 2}
            sides={5}
            radius={Math.min(element.width, element.height) / 2}
            {...getFillProps()}
            {...strokeProps}
          />
        );
      case 'hexagon':
        return (
          <RegularPolygon
            {...commonProps}
            x={element.x + element.width / 2}
            y={element.y + element.height / 2}
            sides={6}
            radius={Math.min(element.width, element.height) / 2}
            {...getFillProps()}
            {...strokeProps}
          />
        );
      case 'diamond':
        return (
          <RegularPolygon
            {...commonProps}
            x={element.x + element.width / 2}
            y={element.y + element.height / 2}
            sides={4}
            radius={Math.min(element.width, element.height) / 2}
            rotation={(element.rotation || 0) + 45}
            {...getFillProps()}
            {...strokeProps}
          />
        );
      case 'star':
        return (
          <Star
            {...commonProps}
            x={element.x + element.width / 2}
            y={element.y + element.height / 2}
            numPoints={element.numPoints || 5}
            innerRadius={element.innerRadius || element.width * 0.25}
            outerRadius={element.outerRadius || element.width * 0.5}
            {...getFillProps()}
            {...strokeProps}
          />
        );
      case 'line':
        return (
          <Line
            {...commonProps}
            points={element.points || [0, 0, element.width, 0]}
            stroke={element.fill}
            strokeWidth={element.height || 4}
            lineCap="round"
          />
        );
      default:
        return null;
    }
  };

  // Render canvas element
  const renderElement = (element: DesignElement) => {
    const isSelected = selectedId === element.id;

    if (element.type === 'text') {
      const textEl = element as TextElement;
      return (
        <Text
          key={element.id}
          id={element.id}
          x={element.x}
          y={element.y}
          text={textEl.text}
          fontSize={textEl.fontSize}
          fontFamily={textEl.fontFamily}
          fontStyle={textEl.fontStyle}
          fill={textEl.fill}
          align={textEl.align}
          width={textEl.width}
          rotation={element.rotation || 0}
          draggable
          onClick={() => setSelectedId(element.id)}
          onTap={() => setSelectedId(element.id)}
          onDragEnd={(e) => handleDragEnd(e, element.id)}
          onTransformEnd={(e) => handleTransformEnd(e, element.id)}
          onDblClick={(e) => handleTextDblClick(e, element.id)}
          onDblTap={(e) => handleTextDblClick(e, element.id)}
        />
      );
    }

    if (element.type === 'image') {
      const imgEl = element as ImageElement;
      return (
        <KonvaImage
          key={element.id}
          id={element.id}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          image={imgEl.imageObj}
          rotation={element.rotation || 0}
          draggable
          onClick={() => setSelectedId(element.id)}
          onTap={() => setSelectedId(element.id)}
          onDragEnd={(e) => handleDragEnd(e, element.id)}
          onTransformEnd={(e) => handleTransformEnd(e, element.id)}
        />
      );
    }

    if (element.type === 'shape') {
      return renderShape(element as ShapeElement);
    }

    return null;
  };

  return (
    <div className="flex gap-4">
      {/* Left side: Canvas and inline toolbar */}
      <div className="flex flex-col gap-3">
        {/* Compact Toolbar above canvas */}
        <div className="flex items-center gap-1 p-2 bg-muted rounded-lg flex-wrap" style={{ minWidth: width * scale }}>
          {/* Add Elements */}
          <Button type="button" variant="outline" size="sm" onClick={addText} className="h-8 px-2">
            <Type className="h-4 w-4 mr-1" /> Text
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 px-2">
            <ImageIcon className="h-4 w-4 mr-1" /> Image
          </Button>

          {/* Shapes Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 px-2">
                <Square className="h-4 w-4 mr-1" /> Shapes
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Add Shape</Label>
                <div className="grid grid-cols-3 gap-2">
                  {SHAPE_CONFIGS.map((shape) => (
                    <Button
                      key={shape.type}
                      variant="outline"
                      size="sm"
                      className="h-12 flex-col gap-1"
                      onClick={() => {
                        addShape(shape.type);
                      }}
                    >
                      {shape.icon}
                      <span className="text-[10px]">{shape.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Undo/Redo */}
          <Button type="button" variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0} title="Undo" className="h-8 w-8">
            <Undo className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo" className="h-8 w-8">
            <Redo className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Background Color with Gradients */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 px-2 gap-1.5" title="Background Color">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor }} />
                <span className="text-xs">Background</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3">
              <Tabs defaultValue="colors" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="colors" className="text-xs">Colors</TabsTrigger>
                  <TabsTrigger value="gradients" className="text-xs">Gradients</TabsTrigger>
                </TabsList>
                <TabsContent value="colors" className="mt-2 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => updateBackgroundColor(e.target.value)}
                      className="w-10 h-8 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => updateBackgroundColor(e.target.value)}
                      className="flex-1 h-8 text-xs font-mono"
                      placeholder="#FFFFFF"
                    />
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {EXTENDED_COLOR_PALETTE.slice(0, 50).map((color, idx) => (
                      <button
                        key={`${color}-${idx}`}
                        className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform hover:shadow-md"
                        style={{ backgroundColor: color }}
                        onClick={() => updateBackgroundColor(color)}
                        title={color}
                      />
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="gradients" className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">Gradient backgrounds coming soon!</p>
                  <div className="grid grid-cols-4 gap-2">
                    {GRADIENT_PRESETS.slice(0, 8).map((preset) => (
                      <button
                        key={preset.name}
                        className="h-10 rounded border border-gray-200 hover:scale-105 transition-transform hover:shadow-md"
                        style={{ background: getGradientCSS(preset.gradient) }}
                        title={preset.name}
                        onClick={() => {
                          // For now, just set the first color
                          updateBackgroundColor(preset.gradient.stops[0].color);
                        }}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </PopoverContent>
          </Popover>

          {/* Zoom */}
          <Button type="button" variant="ghost" size="icon" onClick={() => setScale(Math.max(0.5, scale - 0.1))} title="Zoom Out" className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button type="button" variant="ghost" size="icon" onClick={() => setScale(Math.min(2, scale + 0.1))} title="Zoom In" className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          {/* Export/Save */}
          <Button type="button" variant="outline" size="sm" onClick={exportToPNG} className="h-8 px-2" title="Download PNG">
            <Download className="h-4 w-4" />
          </Button>
          {onSave && (
            <Button type="button" size="sm" onClick={handleSave} disabled={isSaving} className="h-8 px-3">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </>
              )}
            </Button>
          )}
        </div>

        {/* Canvas */}
        <div
          className="border rounded-lg overflow-hidden bg-gray-100"
          style={{ boxShadow: '0 0 20px rgba(0,0,0,0.1)' }}
        >
          <Stage
            ref={stageRef}
            width={width * scale}
            height={height * scale}
            scaleX={scale}
            scaleY={scale}
            onClick={handleStageClick}
            onTap={handleStageClick}
            style={{ backgroundColor: '#f3f4f6' }}
          >
            <Layer>
              <Rect x={0} y={0} width={width} height={height} fill={backgroundColor} />
              {elements.map(renderElement)}
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 20 || newBox.height < 20) return oldBox;
                  return newBox;
                }}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']}
                rotateEnabled={true}
                borderStroke="#3B82F6"
                anchorFill="#FFFFFF"
                anchorStroke="#3B82F6"
                anchorSize={10}
                anchorCornerRadius={5}
              />
            </Layer>
          </Stage>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {width} x {height}px &middot; Click text to select, then type in the panel {selectedElement?.type === 'text' ? '→' : ''}
        </p>
      </div>

      {/* Right side: Properties & Layers Panel */}
      <Card className="w-64 shrink-0 self-start">
        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-9">
            <TabsTrigger value="properties" className="text-xs">Properties</TabsTrigger>
            <TabsTrigger value="layers" className="text-xs">
              Layers {elements.length > 0 && `(${elements.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="m-0">
            <CardContent className="p-3">
              {selectedElement ? (
                <div className="space-y-3">
                  {/* Element actions row */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {selectedElement.type === 'text' ? 'Text' : selectedElement.type === 'image' ? 'Image' : (selectedElement as ShapeElement).shapeType}
                    </span>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" onClick={() => moveLayer('up')} title="Bring Forward" className="h-7 w-7">
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => moveLayer('down')} title="Send Backward" className="h-7 w-7">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={duplicateSelected} title="Duplicate" className="h-7 w-7">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={deleteSelected} className="h-7 w-7 text-destructive" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Text Properties */}
                  {selectedElement.type === 'text' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Text <span className="text-muted-foreground font-normal">(type here to edit)</span></Label>
                        <Input
                          ref={textInputRef}
                          value={(selectedElement as TextElement).text}
                          onChange={(e) => updateElementWithHistory(selectedElement.id, { text: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Enter your text..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Font</Label>
                          <Select
                            value={(selectedElement as TextElement).fontFamily}
                            onValueChange={(value) => updateElementWithHistory(selectedElement.id, { fontFamily: value })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FONTS.map((font) => (
                                <SelectItem key={font.value} value={font.value} className="text-xs">
                                  <span style={{ fontFamily: font.value }}>{font.value}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Size</Label>
                          <Input
                            type="number"
                            value={(selectedElement as TextElement).fontSize}
                            onChange={(e) => updateElementWithHistory(selectedElement.id, { fontSize: parseInt(e.target.value) || 24 })}
                            min={8}
                            max={72}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          <Button
                            variant={(selectedElement as TextElement).fontStyle.includes('bold') ? 'default' : 'outline'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              const current = (selectedElement as TextElement).fontStyle;
                              const isBold = current.includes('bold');
                              const isItalic = current.includes('italic');
                              let newStyle = 'normal';
                              if (!isBold && !isItalic) newStyle = 'bold';
                              else if (!isBold && isItalic) newStyle = 'bold italic';
                              else if (isBold && !isItalic) newStyle = 'normal';
                              else newStyle = 'italic';
                              updateElementWithHistory(selectedElement.id, { fontStyle: newStyle });
                            }}
                          >
                            <Bold className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant={(selectedElement as TextElement).fontStyle.includes('italic') ? 'default' : 'outline'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              const current = (selectedElement as TextElement).fontStyle;
                              const isBold = current.includes('bold');
                              const isItalic = current.includes('italic');
                              let newStyle = 'normal';
                              if (!isBold && !isItalic) newStyle = 'italic';
                              else if (isBold && !isItalic) newStyle = 'bold italic';
                              else if (!isBold && isItalic) newStyle = 'normal';
                              else newStyle = 'bold';
                              updateElementWithHistory(selectedElement.id, { fontStyle: newStyle });
                            }}
                          >
                            <Italic className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Separator orientation="vertical" className="h-5" />
                        <div className="flex gap-0.5">
                          <Button
                            variant={(selectedElement as TextElement).align === 'left' ? 'default' : 'outline'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateElementWithHistory(selectedElement.id, { align: 'left' })}
                          >
                            <AlignLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant={(selectedElement as TextElement).align === 'center' ? 'default' : 'outline'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateElementWithHistory(selectedElement.id, { align: 'center' })}
                          >
                            <AlignCenter className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant={(selectedElement as TextElement).align === 'right' ? 'default' : 'outline'}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateElementWithHistory(selectedElement.id, { align: 'right' })}
                          >
                            <AlignRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={(selectedElement as TextElement).fill}
                            onChange={(e) => updateElementWithHistory(selectedElement.id, { fill: e.target.value })}
                            className="w-8 h-8 p-1 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={(selectedElement as TextElement).fill}
                            onChange={(e) => updateElementWithHistory(selectedElement.id, { fill: e.target.value })}
                            className="flex-1 h-8 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-11 gap-1 pt-1">
                          {COLOR_PALETTE.map((color) => (
                            <button
                              key={color}
                              className="w-4 h-4 rounded border border-gray-200 hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                              onClick={() => updateElementWithHistory(selectedElement.id, { fill: color })}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Position</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground w-4">X</span>
                            <Input
                              type="number"
                              value={Math.round(selectedElement.x)}
                              onChange={(e) => updateElementWithHistory(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground w-4">Y</span>
                            <Input
                              type="number"
                              value={Math.round(selectedElement.y)}
                              onChange={(e) => updateElementWithHistory(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Properties */}
                  {selectedElement.type === 'image' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Size: {Math.round(selectedElement.width || 100)}px</Label>
                        <Slider
                          value={[selectedElement.width || 100]}
                          onValueChange={([value]) => {
                            const ratio = (selectedElement.height || 100) / (selectedElement.width || 100);
                            updateElement(selectedElement.id, { width: value, height: value * ratio });
                          }}
                          onValueCommit={([value]) => {
                            const ratio = (selectedElement.height || 100) / (selectedElement.width || 100);
                            updateElementWithHistory(selectedElement.id, { width: value, height: value * ratio });
                          }}
                          min={20}
                          max={width}
                          step={1}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Position</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground w-4">X</span>
                            <Input
                              type="number"
                              value={Math.round(selectedElement.x)}
                              onChange={(e) => updateElementWithHistory(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground w-4">Y</span>
                            <Input
                              type="number"
                              value={Math.round(selectedElement.y)}
                              onChange={(e) => updateElementWithHistory(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="w-full h-8" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-3.5 w-3.5 mr-1" /> Replace Image
                      </Button>
                    </div>
                  )}

                  {/* Shape Properties */}
                  {selectedElement.type === 'shape' && (
                    <div className="space-y-3">
                      {/* Fill Color or Gradient */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Fill</Label>
                        <Tabs defaultValue={(selectedElement as ShapeElement).gradient ? 'gradient' : 'solid'} className="w-full">
                          <TabsList className="grid w-full grid-cols-2 h-7">
                            <TabsTrigger value="solid" className="text-[10px]">Solid</TabsTrigger>
                            <TabsTrigger value="gradient" className="text-[10px]">Gradient</TabsTrigger>
                          </TabsList>
                          <TabsContent value="solid" className="mt-2 space-y-2">
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={(selectedElement as ShapeElement).fill || '#3B82F6'}
                                onChange={(e) => updateElementWithHistory(selectedElement.id, { fill: e.target.value, gradient: undefined })}
                                className="w-8 h-8 p-1 cursor-pointer"
                              />
                              <Input
                                type="text"
                                value={(selectedElement as ShapeElement).fill || '#3B82F6'}
                                onChange={(e) => updateElementWithHistory(selectedElement.id, { fill: e.target.value, gradient: undefined })}
                                className="flex-1 h-8 text-xs font-mono"
                              />
                            </div>
                            <div className="grid grid-cols-10 gap-1">
                              {EXTENDED_COLOR_PALETTE.slice(0, 40).map((color, idx) => (
                                <button
                                  key={`shape-${color}-${idx}`}
                                  className="w-4 h-4 rounded border border-gray-200 hover:scale-110 transition-transform"
                                  style={{ backgroundColor: color }}
                                  onClick={() => updateElementWithHistory(selectedElement.id, { fill: color, gradient: undefined })}
                                  title={color}
                                />
                              ))}
                            </div>
                          </TabsContent>
                          <TabsContent value="gradient" className="mt-2 space-y-2">
                            <div className="grid grid-cols-4 gap-1.5">
                              {GRADIENT_PRESETS.map((preset) => (
                                <button
                                  key={preset.name}
                                  className={`h-8 rounded border hover:scale-105 transition-transform ${
                                    JSON.stringify((selectedElement as ShapeElement).gradient) === JSON.stringify(preset.gradient)
                                      ? 'border-primary ring-1 ring-primary'
                                      : 'border-gray-200'
                                  }`}
                                  style={{ background: getGradientCSS(preset.gradient) }}
                                  title={preset.name}
                                  onClick={() => updateElementWithHistory(selectedElement.id, { gradient: preset.gradient })}
                                />
                              ))}
                            </div>
                            {(selectedElement as ShapeElement).gradient && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-7 text-xs"
                                onClick={() => updateElementWithHistory(selectedElement.id, { gradient: undefined })}
                              >
                                Remove Gradient
                              </Button>
                            )}
                          </TabsContent>
                        </Tabs>
                      </div>

                      {/* Stroke/Border */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Border</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={(selectedElement as ShapeElement).stroke || '#000000'}
                            onChange={(e) => updateElementWithHistory(selectedElement.id, {
                              stroke: e.target.value,
                              strokeWidth: (selectedElement as ShapeElement).strokeWidth || 2
                            })}
                            className="w-8 h-8 p-1 cursor-pointer"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground w-10">Width:</span>
                              <Slider
                                value={[(selectedElement as ShapeElement).strokeWidth || 0]}
                                onValueChange={([value]) => updateElement(selectedElement.id, {
                                  strokeWidth: value,
                                  stroke: value > 0 ? ((selectedElement as ShapeElement).stroke || '#000000') : undefined
                                })}
                                onValueCommit={([value]) => updateElementWithHistory(selectedElement.id, {
                                  strokeWidth: value,
                                  stroke: value > 0 ? ((selectedElement as ShapeElement).stroke || '#000000') : undefined
                                })}
                                min={0}
                                max={20}
                                step={1}
                                className="flex-1"
                              />
                              <span className="text-[10px] w-6">{(selectedElement as ShapeElement).strokeWidth || 0}px</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Opacity */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Opacity</Label>
                          <span className="text-[10px] text-muted-foreground">{Math.round(((selectedElement as ShapeElement).opacity ?? 1) * 100)}%</span>
                        </div>
                        <Slider
                          value={[((selectedElement as ShapeElement).opacity ?? 1) * 100]}
                          onValueChange={([value]) => updateElement(selectedElement.id, { opacity: value / 100 })}
                          onValueCommit={([value]) => updateElementWithHistory(selectedElement.id, { opacity: value / 100 })}
                          min={10}
                          max={100}
                          step={5}
                        />
                      </div>

                      {/* Corner Radius (rectangles only) */}
                      {(selectedElement as ShapeElement).shapeType === 'rectangle' && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Corner Radius</Label>
                            <span className="text-[10px] text-muted-foreground">{(selectedElement as ShapeElement).cornerRadius || 0}px</span>
                          </div>
                          <Slider
                            value={[(selectedElement as ShapeElement).cornerRadius || 0]}
                            onValueChange={([value]) => updateElement(selectedElement.id, { cornerRadius: value })}
                            onValueCommit={([value]) => updateElementWithHistory(selectedElement.id, { cornerRadius: value })}
                            min={0}
                            max={Math.min((selectedElement as ShapeElement).width, (selectedElement as ShapeElement).height) / 2}
                            step={1}
                          />
                        </div>
                      )}

                      {/* Star Points (stars only) */}
                      {(selectedElement as ShapeElement).shapeType === 'star' && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Points</Label>
                            <span className="text-[10px] text-muted-foreground">{(selectedElement as ShapeElement).numPoints || 5}</span>
                          </div>
                          <Slider
                            value={[(selectedElement as ShapeElement).numPoints || 5]}
                            onValueChange={([value]) => updateElement(selectedElement.id, { numPoints: value })}
                            onValueCommit={([value]) => updateElementWithHistory(selectedElement.id, { numPoints: value })}
                            min={3}
                            max={12}
                            step={1}
                          />
                        </div>
                      )}

                      {/* Size */}
                      <div className="space-y-1">
                        <Label className="text-xs">Size</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground w-4">W</span>
                            <Input
                              type="number"
                              value={Math.round((selectedElement as ShapeElement).width)}
                              onChange={(e) => updateElementWithHistory(selectedElement.id, { width: parseInt(e.target.value) || 50 })}
                              className="h-7 text-xs"
                              min={10}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground w-4">H</span>
                            <Input
                              type="number"
                              value={Math.round((selectedElement as ShapeElement).height)}
                              onChange={(e) => updateElementWithHistory(selectedElement.id, { height: parseInt(e.target.value) || 50 })}
                              className="h-7 text-xs"
                              min={10}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Position */}
                      <div className="space-y-1">
                        <Label className="text-xs">Position</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground w-4">X</span>
                            <Input
                              type="number"
                              value={Math.round(selectedElement.x)}
                              onChange={(e) => updateElementWithHistory(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground w-4">Y</span>
                            <Input
                              type="number"
                              value={Math.round(selectedElement.y)}
                              onChange={(e) => updateElementWithHistory(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Move className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">Select an element to edit</p>
                  <p className="text-xs mt-1">Click any element on the canvas</p>
                  <p className="text-xs mt-2 text-primary/70">Tip: Use Shapes for colors & gradients!</p>
                </div>
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="layers" className="m-0">
            <CardContent className="p-3">
              {elements.length > 0 ? (
                <div className="space-y-1">
                  {[...elements].reverse().map((element, index) => {
                    // Get appropriate icon for element type
                    const getIcon = () => {
                      if (element.type === 'text') return <Type className="h-3.5 w-3.5 shrink-0" />;
                      if (element.type === 'image') return <ImageIcon className="h-3.5 w-3.5 shrink-0" />;
                      // Shape icons
                      const shapeEl = element as ShapeElement;
                      switch (shapeEl.shapeType) {
                        case 'rectangle': return <Square className="h-3.5 w-3.5 shrink-0" />;
                        case 'circle':
                        case 'ellipse': return <CircleIcon className="h-3.5 w-3.5 shrink-0" />;
                        case 'triangle': return <Triangle className="h-3.5 w-3.5 shrink-0" />;
                        case 'star': return <StarIcon className="h-3.5 w-3.5 shrink-0" />;
                        case 'pentagon': return <Pentagon className="h-3.5 w-3.5 shrink-0" />;
                        case 'hexagon': return <Hexagon className="h-3.5 w-3.5 shrink-0" />;
                        case 'diamond': return <Diamond className="h-3.5 w-3.5 shrink-0" />;
                        case 'line': return <Minus className="h-3.5 w-3.5 shrink-0" />;
                        default: return <Square className="h-3.5 w-3.5 shrink-0" />;
                      }
                    };

                    // Get element label
                    const getLabel = () => {
                      if (element.type === 'text') return (element as TextElement).text.substring(0, 20) || 'Empty text';
                      if (element.type === 'image') return `Image ${elements.length - index}`;
                      return `${(element as ShapeElement).shapeType.charAt(0).toUpperCase() + (element as ShapeElement).shapeType.slice(1)}`;
                    };

                    return (
                      <div
                        key={element.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors text-sm ${
                          selectedId === element.id ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedId(element.id)}
                      >
                        {element.type === 'shape' && (element as ShapeElement).gradient ? (
                          <div
                            className="w-3.5 h-3.5 rounded shrink-0"
                            style={{ background: getGradientCSS((element as ShapeElement).gradient!) }}
                          />
                        ) : element.type === 'shape' ? (
                          <div
                            className="w-3.5 h-3.5 rounded shrink-0 border border-gray-300"
                            style={{ backgroundColor: (element as ShapeElement).fill }}
                          />
                        ) : null}
                        {element.type !== 'shape' && getIcon()}
                        <span className="text-xs truncate flex-1">{getLabel()}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No elements yet</p>
                  <p className="text-xs mt-1">Add text, images, or shapes</p>
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

// Export types for use in other components
export type { DesignElement, TextElement, ImageElement, ShapeElement, ShapeType, GradientFill, LinearGradient, RadialGradient, GradientStop };
