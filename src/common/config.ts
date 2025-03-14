//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

/**
 * This global config object allows developers to change common settings.
 */
const globalConfig: { maxJsonSize: number | undefined } = {
  maxJsonSize: 10 * 1024 * 1024,
};

export function setMaxJsonSize(size: number | undefined): void {
  if (size !== undefined && (!Number.isInteger(size) || size <= 0)) {
    throw new Error("setMaxJsonSize: size must be a positive integer.");
  }
  globalConfig.maxJsonSize = size;
}

/**
 * @hidden
 */
export function getMaxJsonSize(): number | undefined {
  return globalConfig.maxJsonSize;
}

/**
 * @hidden
 */
export function checkResponseSize(response: Response) {
  const contentLength = response.headers.get("Content-Length");
  if (
    globalConfig.maxJsonSize !== undefined &&
    (!contentLength || parseInt(contentLength, 10) > globalConfig.maxJsonSize)
  ) {
    throw new Error(
      `The response body is not safe to parse as JSON. Max size=[${globalConfig.maxJsonSize}], actual=[${contentLength}]`,
    );
  }
}
