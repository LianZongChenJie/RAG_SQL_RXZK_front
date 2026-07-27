import type { ChatParams } from "./index";

// 千问流式对话（SSE）
export interface ChatStreamCallbacks {
  onProgress?: (message: string) => void; // 进度消息，如"正在获取数据表结构..."
  onMessage: (content: string) => void; // 最终结果，逐字输出
  onChart?: (chartData: Record<string, any>) => void; // ECharts 图表数据
  onTableData?: (tableData: any) => void; // 表格数据
  onGeneratedSql?: (sql: string) => void; // 生成的 SQL
  onComplete: () => void;
  onError: (error: Error) => void;
}

export function chatWithQwenStream(
  data: ChatParams,
  callbacks: ChatStreamCallbacks,
): () => void {
  const {
    onMessage,
    onProgress,
    onChart,
    onTableData,
    onGeneratedSql,
    onComplete,
    onError,
  } = callbacks;
  let abortController: AbortController | null = null;
  let currentTypingTimer: ReturnType<typeof setTimeout> | null = null; // 打字机定时器

  // 打字机效果：将内容逐字发送到页面
  function typeWriter(fullContent: string, index: number = 0) {
    if (abortController?.signal.aborted) return;

    if (index < fullContent.length) {
      // 每次发送一个字
      onMessage(fullContent.charAt(index));
      index++;
      // 使用 setTimeout 实现打字效果，约 30ms 一个字符
      currentTypingTimer = setTimeout(() => typeWriter(fullContent, index), 30);
    } else {
      // 打字完成
      onComplete();
    }
  }

  const startStream = async () => {
    try {
      abortController = new AbortController();

      const response = await fetch("/api/qwRag/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(data),
        signal: abortController.signal,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is null");
      }

      let buffer = "";
      let currentEvent = ""; // 当前事件名
      let currentDataBuffer = ""; // 当前事件的累积数据（支持多行 data:）
      let finalResult = ""; // 保存最终结果
      let hasFinalResult = false; // 是否已有最终结果
      let hasError = false; // 是否已有错误

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // 冲刷最后一个事件的累积数据
          flushAccumulatedData();

          // 如果有错误，不输出结果
          if (hasError) {
            break;
          }

          // 如果有最终结果，使用打字机效果输出
          if (finalResult && !hasFinalResult) {
            hasFinalResult = true;
            typeWriter(finalResult);
          } else if (!finalResult) {
            onComplete();
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 尝试处理完整的行
        let lines = buffer.split("\n");
        buffer = lines.pop() || ""; // 保留不完整的行

        // 处理每行
        for (const line of lines) {
          processLine(line.trim());
        }
      }

      // 处理行的函数
      function processLine(trimmedLine: string) {
        if (!trimmedLine) return;

        // 解析 event: 行 → 上一个事件结束，冲刷累积数据
        if (trimmedLine.startsWith("event:")) {
          flushAccumulatedData();
          currentEvent = trimmedLine.slice(6).trim();
          return;
        }

        if (trimmedLine.startsWith("data:")) {
          const dataContent = trimmedLine.slice(5).trim();
          if (dataContent === "[DONE]" || dataContent === "") return;

          // sql_generated 事件直接是 SQL 字符串，不走 JSON 解析
          if (currentEvent === "sql_generated") {
            handleParsedData(currentEvent, dataContent);
            return;
          }

          // 先尝试作为完整 JSON 直接解析（单行 data）
          try {
            const parsed = JSON.parse(dataContent);
            handleParsedData(currentEvent, parsed);
            return;
          } catch {
            // 单行解析失败 → 可能是多行 data，累积起来等后续冲刷
            if (currentDataBuffer) currentDataBuffer += "\n";
            currentDataBuffer += dataContent;
          }
        }
      }

      // 冲刷累积数据（遇到新 event: 或流结束时调用）
      function flushAccumulatedData() {
        if (!currentDataBuffer) return;
        try {
          const parsed = JSON.parse(currentDataBuffer);
          handleParsedData(currentEvent, parsed);
        } catch {
          // 累积数据也解析失败 → message 事件降级为纯文本
          if (currentEvent === "message" && currentDataBuffer) {
            onMessage(currentDataBuffer);
          }
        }
        currentDataBuffer = "";
      }

      // 通用的已解析数据处理函数
      function handleParsedData(event: string, parsed: any) {
        if (event === "message") {
          const content = parsed.output?.choices?.[0]?.message?.content || "";
          if (content) onMessage(content);
        } else if (event === "complete") {
          const result =
            parsed.data?.renderedResult || parsed.renderedResult || "";
          if (result) finalResult = result;
        } else if (event === "sql_generated") {
          // sql_generated 事件的 data 是纯 SQL 字符串
          const sql = typeof parsed === "string" ? parsed : "";
          if (sql && onGeneratedSql) onGeneratedSql(sql);
        } else if (event === "chart") {
          if (onChart) onChart(parsed);
        } else if (event === "tableData") {
          // tableData 可能是字符串数组，需要解析为对象数组
          let tableData = parsed;
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
            try {
              tableData = parsed.map((item: string) => JSON.parse(item));
            } catch (err) {
              console.error("[stream] 解析 tableData 字符串数组失败:", err);
            }
          }
          if (onTableData) onTableData(tableData);
        } else if (event === "error") {
          const errorMsg =
            parsed.errorMessage || parsed.message || "请求失败，请稍后重试";
          hasError = true;
          onError(new Error(errorMsg));
        } else {
          const progressMsg = parsed.message || "";
          if (progressMsg && onProgress) onProgress(progressMsg);
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        onError(error as Error);
      }
    }
  };

  startStream();

  // 返回取消函数
  return () => {
    if (currentTypingTimer) {
      clearTimeout(currentTypingTimer);
    }
    abortController?.abort();
  };
}
