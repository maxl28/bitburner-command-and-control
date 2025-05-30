// Based on https://github.com/danielyxie/bitburner/blob/master/src/data/codingcontracttypes.ts
export const codingContractTypesMetadata = [
  {
    name: 'Find Largest Prime Factor',
    solver: function (data) {
      var fac = 2
      var n = data
      while (n > (fac - 1) * (fac - 1)) {
        while (n % fac === 0) {
          n = Math.round(n / fac)
        }
        ++fac
      }
      return n === 1 ? fac - 1 : n
    },
  },
  {
    name: 'Subarray with Maximum Sum',
    solver: function (data) {
      var nums = data.slice()
      for (var i = 1; i < nums.length; i++) {
        nums[i] = Math.max(nums[i], nums[i] + nums[i - 1])
      }
      return Math.max.apply(Math, nums)
    },
  },
  {
    name: 'Spiralize Matrix',
    solver: function (data) {
      var spiral = []
      var m = data.length
      var n = data[0].length
      var u = 0
      var d = m - 1
      var l = 0
      var r = n - 1
      var k = 0
      while (true) {
        // Up
        for (var col = l; col <= r; col++) {
          spiral[k] = data[u][col]
          ++k
        }
        if (++u > d) {
          break
        }
        // Right
        for (var row = u; row <= d; row++) {
          spiral[k] = data[row][r]
          ++k
        }
        if (--r < l) {
          break
        }
        // Down
        for (var col = r; col >= l; col--) {
          spiral[k] = data[d][col]
          ++k
        }
        if (--d < u) {
          break
        }
        // Left
        for (var row = d; row >= u; row--) {
          spiral[k] = data[row][l]
          ++k
        }
        if (++l > r) {
          break
        }
      }

      return spiral
    },
  },
  {
    name: 'Array Jumping Game',
    solver: function (data) {
      var n = data.length
      var i = 0
      for (var reach = 0; i < n && i <= reach; ++i) {
        reach = Math.max(i + data[i], reach)
      }
      var solution = i === n
      return solution ? 1 : 0
    },
  },
  {
    name: 'Merge Overlapping Intervals',
    solver: function (data) {
      var intervals = data.slice()
      intervals.sort(function (a, b) {
        return a[0] - b[0]
      })
      var result = []
      var start = intervals[0][0]
      var end = intervals[0][1]
      for (var _i = 0, intervals_1 = intervals; _i < intervals_1.length; _i++) {
        var interval = intervals_1[_i]
        if (interval[0] <= end) {
          end = Math.max(end, interval[1])
        } else {
          result.push([start, end])
          start = interval[0]
          end = interval[1]
        }
      }
      result.push([start, end])
      var sanitizedResult = convert2DArrayToString(result)
      return sanitizedResult
    },
  },
  {
    name: 'Generate IP Addresses',
    solver: function (data, ans) {
      var ret = []
      for (var a = 1; a <= 3; ++a) {
        for (var b = 1; b <= 3; ++b) {
          for (var c = 1; c <= 3; ++c) {
            for (var d = 1; d <= 3; ++d) {
              if (a + b + c + d === data.length) {
                var A = parseInt(data.substring(0, a), 10)
                var B = parseInt(data.substring(a, a + b), 10)
                var C = parseInt(data.substring(a + b, a + b + c), 10)
                var D = parseInt(data.substring(a + b + c, a + b + c + d), 10)
                if (A <= 255 && B <= 255 && C <= 255 && D <= 255) {
                  var ip = [A.toString(), '.', B.toString(), '.', C.toString(), '.', D.toString()].join('')
                  if (ip.length === data.length + 3) {
                    ret.push(ip)
                  }
                }
              }
            }
          }
        }
      }
      return ret
    },
  },
  {
    name: 'Algorithmic Stock Trader I',
    solver: function (data) {
      var maxCur = 0
      var maxSoFar = 0
      for (var i = 1; i < data.length; ++i) {
        maxCur = Math.max(0, (maxCur += data[i] - data[i - 1]))
        maxSoFar = Math.max(maxCur, maxSoFar)
      }
      return maxSoFar.toString()
    },
  },
  {
    name: 'Algorithmic Stock Trader II',
    solver: function (data) {
      var profit = 0
      for (var p = 1; p < data.length; ++p) {
        profit += Math.max(data[p] - data[p - 1], 0)
      }
      return profit.toString()
    },
  },
  {
    name: 'Algorithmic Stock Trader III',
    solver: function (data) {
      var hold1 = Number.MIN_SAFE_INTEGER
      var hold2 = Number.MIN_SAFE_INTEGER
      var release1 = 0
      var release2 = 0
      for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
        var price = data_1[_i]
        release2 = Math.max(release2, hold2 + price)
        hold2 = Math.max(hold2, release1 - price)
        release1 = Math.max(release1, hold1 + price)
        hold1 = Math.max(hold1, price * -1)
      }
      return release2.toString()
    },
  },
  {
    name: 'Algorithmic Stock Trader IV',
    solver: function (data) {
      var k = data[0]
      var prices = data[1]
      var len = prices.length
      if (len < 2) {
        return 0
      }
      if (k > len / 2) {
        var res = 0
        for (var i = 1; i < len; ++i) {
          res += Math.max(prices[i] - prices[i - 1], 0)
        }
        return res
      }
      var hold = []
      var rele = []
      hold.length = k + 1
      rele.length = k + 1
      for (var i = 0; i <= k; ++i) {
        hold[i] = Number.MIN_SAFE_INTEGER
        rele[i] = 0
      }
      var cur
      for (var i = 0; i < len; ++i) {
        cur = prices[i]
        for (var j = k; j > 0; --j) {
          rele[j] = Math.max(rele[j], hold[j] + cur)
          hold[j] = Math.max(hold[j], rele[j - 1] - cur)
        }
      }
      return rele[k]
    },
  },
  {
    name: 'Minimum Path Sum in a Triangle',
    solver: function (data) {
      var n = data.length
      var dp = data[n - 1].slice()
      for (var i = n - 2; i > -1; --i) {
        for (var j = 0; j < data[i].length; ++j) {
          dp[j] = Math.min(dp[j], dp[j + 1]) + data[i][j]
        }
      }
      return dp[0]
    },
  },
  {
    name: 'Unique Paths in a Grid I',
    solver: function (data) {
      var n = data[0] // Number of rows
      var m = data[1] // Number of columns
      var currentRow = []
      currentRow.length = n
      for (var i = 0; i < n; i++) {
        currentRow[i] = 1
      }
      for (var row = 1; row < m; row++) {
        for (var i = 1; i < n; i++) {
          currentRow[i] += currentRow[i - 1]
        }
      }
      return currentRow[n - 1]
    },
  },
  {
    name: 'Unique Paths in a Grid II',
    solver: function (data) {
      var obstacleGrid = []
      obstacleGrid.length = data.length
      for (var i = 0; i < obstacleGrid.length; ++i) {
        obstacleGrid[i] = data[i].slice()
      }
      for (var i = 0; i < obstacleGrid.length; i++) {
        for (var j = 0; j < obstacleGrid[0].length; j++) {
          if (obstacleGrid[i][j] == 1) {
            obstacleGrid[i][j] = 0
          } else if (i == 0 && j == 0) {
            obstacleGrid[0][0] = 1
          } else {
            obstacleGrid[i][j] = (i > 0 ? obstacleGrid[i - 1][j] : 0) + (j > 0 ? obstacleGrid[i][j - 1] : 0)
          }
        }
      }
      return obstacleGrid[obstacleGrid.length - 1][obstacleGrid[0].length - 1]
    },
  },
  {
    name: 'Sanitize Parentheses in Expression',
    solver: function (data) {
      var left = 0
      var right = 0
      var res = []
      for (var i = 0; i < data.length; ++i) {
        if (data[i] === '(') {
          ++left
        } else if (data[i] === ')') {
          left > 0 ? --left : ++right
        }
      }
      function dfs(pair, index, left, right, s, solution, res) {
        if (s.length === index) {
          if (left === 0 && right === 0 && pair === 0) {
            for (var i = 0; i < res.length; i++) {
              if (res[i] === solution) {
                return
              }
            }
            res.push(solution)
          }
          return
        }
        if (s[index] === '(') {
          if (left > 0) {
            dfs(pair, index + 1, left - 1, right, s, solution, res)
          }
          dfs(pair + 1, index + 1, left, right, s, solution + s[index], res)
        } else if (s[index] === ')') {
          if (right > 0) dfs(pair, index + 1, left, right - 1, s, solution, res)
          if (pair > 0) dfs(pair - 1, index + 1, left, right, s, solution + s[index], res)
        } else {
          dfs(pair, index + 1, left, right, s, solution + s[index], res)
        }
      }
      dfs(0, 0, left, right, data, '', res)

      return res
    },
  },
  {
    name: 'Find All Valid Math Expressions',
    solver: function (data) {
      var num = data[0]
      var target = data[1]
      function helper(res, path, num, target, pos, evaluated, multed) {
        if (pos === num.length) {
          if (target === evaluated) {
            res.push(path)
          }
          return
        }
        for (var i = pos; i < num.length; ++i) {
          if (i != pos && num[pos] == '0') {
            break
          }
          var cur = parseInt(num.substring(pos, i + 1))
          if (pos === 0) {
            helper(res, path + cur, num, target, i + 1, cur, cur)
          } else {
            helper(res, path + '+' + cur, num, target, i + 1, evaluated + cur, cur)
            helper(res, path + '-' + cur, num, target, i + 1, evaluated - cur, -cur)
            helper(res, path + '*' + cur, num, target, i + 1, evaluated - multed + multed * cur, multed * cur)
          }
        }
      }

      if (num == null || num.length === 0) {
        return []
      }
      var result = []
      helper(result, '', num, target, 0, 0, 0)
      return result
    },
  },
  {
    name: 'Compression II: LZ Decompression',
    solver: function(data) {
      let decodedMsg = ''
      let counter = data.length
      let typeI = true

      // Digest chunks
      while (data.length > 1 && counter > 0) {
        counter--

        // Determin length L of chunk.
        let L = parseInt( data[0] )

        // We have an empty chunk
        if (L === 0) {
          // Remove chunk
          data = data.substring(1)

          typeI = !typeI

          // proceed to next chunk
          continue
        }

        // Type II chunk, reference to earlier Type I
        if ( data[1].match(/\d/) && (!typeI || (data.length == 2 && L > 1))) {
          // Determine character reference X
          let X = parseInt( data[1], 10 )

          // Translate the reference index to match our decoded string so far.
          let refIndex = decodedMsg.length - X

          // Remember data piece we want to repeat
          let chunk = decodedMsg.substring( refIndex, refIndex + X )

          // Fill in chunk until length satisfied
          while (L > 0) {
            // Add referenced char chain to result
            decodedMsg += chunk.substring(0, Math.min(L, X))

            // Adjust remaining length
            L -= X
          }

          // Modify L to crop the correct number of chars from remaining data
          L = 1
        }
        // Type 1 chunk, containing valid ASCII symbols
        else {
          // Add L chars to result
          decodedMsg += data.substring(1, 1+L)
        }

        // Remove processed chars from encoded data
        data = data.substring(1+L)

        typeI = !typeI
      }

      return decodedMsg
    }
  },
  {
    name: 'Compression III: LZ Compression @@@',
    solver: function solver(data) {
      let encodedMsg = ''
      let processedData = ''
      let counter = 0

      do {
        // Prepare our dictionary, in case we need it.
        let dict = processedData.substring(
          Math.max(0, processedData.length-9),
          processedData.length
        )

        let chunk = '',
          dictIndex = -1
        
        console.log('---CHUNK---')
        for ( let i = 1; i < 10; i++ ) {
          // Terminate on End-Of-Message reached
          if ( i > data.length ) break

          // Split of a chunk from original message
          chunk = data.substring(0, i)

          // Can we use a reference AND do we shorten the message in case we skip a Type I?
          if ( dict.includes(chunk) && (counter % 2 > 0 || chunk.length > 2) && !dict.includes(chunk + data[i]) ) {
            // Search our dictionary for reference
            dictIndex = dict.lastIndexOf(chunk)

            console.log('REF: ', chunk, dictIndex)

            break
          }

          // Do we have a non-expandable repeating chunk ahead?x
          if ( data.substring(i, i+9).includes(chunk) && !data.substring(i+1, i+9).includes(chunk + data[i])) {
            console.log('REP: ', chunk, i, data.substring(i).indexOf(chunk))

              // Expand chunk to max or until repeat.
              chunk = data.substring(0, Math.min(9, i + data.substring(i).indexOf(chunk)))

              break
          }
        }

        // Fill Type II
        if ( dictIndex > -1 ) {
          console.log('TYPE: II')
          // Do we need to use a filler chunk?
          if ( counter % 2 == 0) {
            console.log('Append Filler')
            encodedMsg += '0'
            counter++
          }

          // Prepare digit counter, remember, dict overflows to start if L > dict.length
          let L = 0

          // Prepare dict for overflow-repeat behaviour
          let localDict = dict.substring(dictIndex)

          // Translate reference index
          let X = Math.abs(dict.length - dictIndex)

          while ( L < 10 ) {
            // Can we still repeat the dict?
            if (localDict[ dictIndex + L % localDict.length ] != data[L]) break

            // Increase digit repeat count
            L++
          }

          // Add result to encoded message.
          encodedMsg += `${L}${X}`

          // Add to progress
          processedData += data.substring(0, L)

          // Shave away processed Data
          data = data.substring(L)

          console.log('L: ', L)
          console.log('X: ', X)
        } 
        // Use Type I
        else {
          console.log('TYPE: I')
          // Do we need to use a filler chunk?
          if ( counter % 2 > 0) {
            console.log('Append Filler')
            encodedMsg += '0'
            counter++
          }

          console.log('D: ', chunk)

          // Add chunk to encoded result
          encodedMsg += `${chunk.length}${chunk}`

          // Add chunk to progress
          processedData += chunk

          // Remove chunk from remaining data
          data = data.substring(chunk.length)
        }

        counter++

        console.log('---END---')
      } while (data.length > 0)

      return encodedMsg
    }
  },
  {
    name: 'Array Jumping Game II',
    solver: function solver(data) {
      
      // Try and find the minimum number of steps trough the list
      let tryStep = (lst, i = 0, path = []) => {
        let steps = []

        // Return on Ping-Pong behaviour.
        if ( path.length > lst.length * 3) return 0

        // Return on END reached.
        if ( i == lst.length - 1) {
          return path.length
        }

        // Check every path in given MAX jump range we haven't visited yet.
        for ( let a = 1; a <= lst[i]; a++ ) {
          // Can move right?
          if ( i + a < lst.length ) {
            // Have we been here before?
            if (!path.includes(i + a)) {
              // Add possible step to list.
              steps.push( tryStep(lst, i + a, [...path, i]) )
            }
          }
        }

        // Strip dead-ends from search results
        steps = steps.filter(v => v > 0)

        // Nowhere to go, signal dead end.
        if ( steps.length == 0 ) return 0

        // Return shortest possible path
        return Math.min(...steps)
      }

      // Return 0 on impossible step length and proper result otherwise.
      return tryStep( data )
    }
  },
  {
    name: 'Compression I: RLE Compression',
    solver: function(input) {
      let answer = ``
      for (let i = 0; i < input.length; i) {
        let char = input[i]
        let count = 1
        while (i + count < input.length && count < 9 && input[i + count] == char) {
          count++
        }

        answer += `${count}${char}`
        i += count
      }

      return answer
    }
  },
  {
    name: 'HammingCodes: Integer to Encoded Binary',
    solver: function(input) {
      const data = input
        .toString(2)
        .split(``)
        .map(b => Number.parseInt(b))

      let numParityBits = 0
      while (Math.pow(2, numParityBits) < numParityBits + data.length + 1) {
        numParityBits++
      }

      const encoding = Array(numParityBits + data.length + 1).fill(0)
      const parityBits = []
      // TODO: populate parityBits with 2^x for x in range 0 to (numParityBits - 1), then
      //       the below calcualtion go away in favor of `if (i in parityBits) continue;
      for (let i = 1; i < encoding.length; i++) {
        const pow = Math.log2(i)
        if (pow - Math.floor(pow) === 0) {
          parityBits.push(i)
          continue
        }

        encoding[i] = data.shift()
      }

      const parity = encoding.reduce(
        (total, bit, index) => (total ^= bit > 0 ? index : 0),
        0
      )
      const parityVals = parity
        .toString(2)
        .split(``)
        .map(b => Number.parseInt(b))
        .reverse()
      while (parityVals.length < parityBits.length) {
        parityVals.push(0)
      }

      for (let i = 0; i < parityBits.length; i++) {
        encoding[parityBits[i]] = parityVals[i]
      }

      const globalParity =
        (encoding.toString().split(`1`).length - 1) % 2 === 0 ? 0 : 1
      encoding[0] = globalParity

      return encoding.reduce((total, bit) => (total += bit), ``)
    }
  },
  {
    name: 'HammingCodes: Encoded Binary to Integer',
    solver: function(data) {
      let encoding = data;

      const max_exponent = Math.floor(Math.log(data.length) / Math.log(2));
      let parityBits = [0];
      for (let i = 0; i < max_exponent; i++) {
          const parityBit = Math.pow(2, i);
          parityBits.push(parityBit);
      }
      const ones = [...data.matchAll(/1/g)];
      const error = ones
          .map((m) => parseInt(m.index))
          .reduce((xor, i) => xor ^ i);
      if (error > 0) {
          const bit = data.charAt(error) === `0` ? `1` : `0`;
          encoding = data.substring(0, error) + bit + data.substring(error + 1);
      }

      for (let i = parityBits.length - 1; i >= 0; i--) {
          const bit = parityBits[i];
          encoding = encoding.substring(0, bit) + encoding.substring(bit + 1);
      }

      return Number.parseInt(encoding, 2);
    }
  },
  {
    name: 'Shortest Path in a Grid',
    solver: data => get_shortest_path(data,  build_distance_map(data))
  },
  {
      name: 'Proper 2-Coloring of a Graph',
      solver: function(data) {
        const vertCount = data[0]
        const edges = get_unique_edges(data[1])
        let colors = new Array(vertCount).fill(undefined)
        colors[0] = 0

        while (true) {
          let edge = edges.find(e => typeof colors[e.v0] !== typeof colors[e.v1])
          if (edge === undefined) {
            edge = edges.find(
              e => colors[e.v0] === undefined && colors[e.v1] === undefined
            )
            if (edge === undefined) break
            colors[edge.v0] = 0
          }

          const newVert = colors[edge.v0] === undefined ? edge.v0 : edge.v1
          const oldVert = colors[edge.v0] === undefined ? edge.v1 : edge.v0
          const lastColor = colors[oldVert]
          const nextColor = lastColor === 0 ? 1 : 0

          const found_conflict = edges
            .filter(e => e !== edge && (e.v0 === newVert || e.v1 === newVert))
            .some(e => {
              const otherVert = e.v0 === newVert ? e.v1 : e.v0
              return colors[otherVert] === nextColor
            })

          if (found_conflict) {
            colors = []
            break
          }

          colors[newVert] = nextColor
      }

      return colors.map(c => (c === undefined ? 0 : c))
    }
  },
  {
    name: 'Encryption I: Caesar Cipher',
    solver: data => {
      const str = data[0]
      const shift = data[1]

      let chars = `ABCDEFGHIJKLMNOPQRSTUVWXYZ`

      const rightShift = chars.length - shift

      let answer = ``
      for (let i = 0; i < str.length; i++) {
        const start = chars.indexOf(str[i])
        if (start < 0) {
          answer += str[i]
          continue
        }
        const end = (start + rightShift) % chars.length

        answer += chars[end]
      }

      return answer
    }
  },
  {
    name: 'Encryption II: Vigenère Cipher',
    solver: data => {
      const str = data[0];
      const keyword = data[1];
  
      let fullkeyword = keyword;
      for (let i = fullkeyword.length; i < str.length; i++) {
          fullkeyword += keyword[i % keyword.length];
      }
      const chars = `ABCDEFGHIJKLMNOPQRSTUVWXYZ`;
  
      let answer = ``;
      for (let i = 0; i < str.length; i++) {
          const shift = chars.indexOf(str[i]);
          const end = (chars.indexOf(fullkeyword[i]) + shift) % chars.length;
  
          answer += chars[end];
      }
      
      return answer
    }
  },
  {
    name: "Compression III: LZ Compression",
    solver: function (plain) {
        let cur_state = Array.from(Array(10), () => Array(10).fill(null));
        let new_state = Array.from(Array(10), () => Array(10));

        function set(state, i, j, str) {
            const current = state[i][j];
            if (current == null || str.length < current.length) {
                state[i][j] = str;
            } else if (str.length === current.length && Math.random() < 0.5) {
                // if two strings are the same length, pick randomly so that
                // we generate more possible inputs to Compression II
                state[i][j] = str;
            }
        }

        // initial state is a literal of length 1
        cur_state[0][1] = "";

        for (let i = 1; i < plain.length; ++i) {
            for (const row of new_state) {
                row.fill(null);
            }
            const c = plain[i];

            // handle literals
            for (let length = 1; length <= 9; ++length) {
                const string = cur_state[0][length];
                if (string == null) {
                    continue;
                }

                if (length < 9) {
                    // extend current literal
                    set(new_state, 0, length + 1, string);
                } else {
                    // start new literal
                    set(new_state, 0, 1, string + "9" + plain.substring(i - 9, i) + "0");
                }

                for (let offset = 1; offset <= Math.min(9, i); ++offset) {
                    if (plain[i - offset] === c) {
                        // start new backreference
                        set(new_state, offset, 1, string + length + plain.substring(i - length, i));
                    }
                }
            }

            // handle backreferences
            for (let offset = 1; offset <= 9; ++offset) {
                for (let length = 1; length <= 9; ++length) {
                    const string = cur_state[offset][length];
                    if (string == null) {
                        continue;
                    }

                    if (plain[i - offset] === c) {
                        if (length < 9) {
                            // extend current backreference
                            set(new_state, offset, length + 1, string);
                        } else {
                            // start new backreference
                            set(new_state, offset, 1, string + "9" + offset + "0");
                        }
                    }

                    // start new literal
                    set(new_state, 0, 1, string + length + offset);

                    // end current backreference and start new backreference
                    for (let new_offset = 1; new_offset <= Math.min(9, i); ++new_offset) {
                        if (plain[i - new_offset] === c) {
                            set(new_state, new_offset, 1, string + length + offset + "0");
                        }
                    }
                }
            }

            const tmp_state = new_state;
            new_state = cur_state;
            cur_state = tmp_state;
        }

        let result = null;

        for (let len = 1; len <= 9; ++len) {
            let string = cur_state[0][len];
            if (string == null) {
                continue;
            }

            string += len + plain.substring(plain.length - len, plain.length);
            if (result == null || string.length < result.length) {
                result = string;
            } else if (string.length == result.length && Math.random() < 0.5) {
                result = string;
            }
        }

        for (let offset = 1; offset <= 9; ++offset) {
            for (let len = 1; len <= 9; ++len) {
                let string = cur_state[offset][len];
                if (string == null) {
                    continue;
                }

                string += len + "" + offset;
                if (result == null || string.length < result.length) {
                    result = string;
                } else if (string.length == result.length && Math.random() < 0.5) {
                    result = string;
                }
            }
        }

        return result ?? "";
    }
  },
  {
    name: 'Total Ways to Sum',
    solver: function (data) {
        const ways = [1]
        ways.length = data + 1
        ways.fill(0, 1)
        for (let i = 1; i < data; ++i) {
            for (let j = i; j <= data; ++j) {
                ways[j] += ways[j - i]
            }
        }
        return ways[data]
    },
  },
  {
      name: 'Total Ways to Sum II',
      solver: function (data) {
          const n = data[0];
          const s = data[1];
          const ways = [1];
          ways.length = n + 1;
          ways.fill(0, 1);
          for (let i = 0; i < s.length; i++) {
              for (let j = s[i]; j <= n; j++) {
                  ways[j] += ways[j - s[i]];
              }
          }
          return ways[n];
      },
  },
  {
    name: 'Square Root',
    /** Uses the Newton-Raphson method to iteratively improve the guess until the answer is found.
     * @param {bigint} n */
    solver: function (n) {
        const two = BigInt(2);
        if (n < two) return n; // Square root of 1 is 1, square root of 0 is 0
        let root = n / two; // Initial guess
        let x1 = (root + n / root) / two;
        while (x1 < root) {
            root = x1;
            x1 = (root + n / root) / two;
        }
        // That's it, solved! At least, we've converged an an answer which should be as close as we can get (might be off by 1)
        // We want the answer to the "nearest integer". Check the answer on either side of the one we converged on to see what's closest
        const bigAbs = (x) => x < 0n ? -x : x; // There's no Math.abs where we're going...
        let absDiff = bigAbs(root * root - n); // How far off we from the perfect square root
        if (absDiff == 0n) return root; // Note that this coding contract doesn't guarantee there's an exact integer square root
        else if (absDiff > bigAbs((root - 1n) * (root - 1n) - n)) root = root - 1n; // Do we get a better answer by subtracting 1?
        else if (absDiff > bigAbs((root + 1n) * (root + 1n) - n)) root = root + 1n; // Do we get a better answer by adding 1?
        // Validation: We should be able to tell if we got this right without wasting a guess. Adding/Subtracting 1 should now always be worse
        absDiff = bigAbs(root * root - n);
        if (absDiff > bigAbs((root - 1n) * (root - 1n) - n) ||
            absDiff > bigAbs((root + 1n) * (root + 1n) - n))
            throw new Error(`Square Root did not converge. Arrived at answer:\n${root} - which when squared, gives:\n${root * root} instead of\n${n}`);
        return root.toString();
    }
  }
]
// 2 Color Graph
// each cell needs even or 0 number of neigbours 

function convert2DArrayToString(arr) {
    const components = []
    arr.forEach((e) => {
        let s = e.toString();
        s = ["[", s, "]"].join("")
        components.push(s)
    });

    return components.join(",").replace(/\s/g, "")
}

class Cell {
  constructor(code, x, y) {
    this.code = code
    this.x = x
    this.y = y
  }
}

function build_distance_map(grid) {
  const width = grid[0].length
  const height = grid.length
  const max_size = width * height
  const map = Array(height)
    .fill([])
    .map(() => Array(width).fill(-1))

  const unvisited_cells = [new Cell(`?`, width - 1, height - 1)]
  let firstCell = true

  while (unvisited_cells.length > 0) {
    const cell = unvisited_cells.pop()

    const neighbors = get_adjacent_cells(grid, cell.x, cell.y)
    const visited_neighbors = neighbors.filter(n => map[n.y][n.x] > -1)
    const unvisited_neighbors = neighbors.filter(n => map[n.y][n.x] === -1)

    if (firstCell) {
      map[cell.y][cell.x] = 0
      firstCell = false
    } else {
      map[cell.y][cell.x] =
        visited_neighbors.reduce(
          (min_dist, n) => Math.min(min_dist, map[n.y][n.x]),
          max_size
        ) + 1
    }

    unvisited_cells.push(...unvisited_neighbors)

    const revisit = visited_neighbors.filter(
      n => map[n.y][n.x] > map[cell.y][cell.x]
    )
    unvisited_cells.push(...revisit)
  }

  return map
}

function get_adjacent_cells(grid, x, y) {
  const width = grid[0].length
  const height = grid.length

  const up = new Cell(`U`, x, y - 1)
  const down = new Cell(`D`, x, y + 1)
  const left = new Cell(`L`, x - 1, y)
  const right = new Cell(`R`, x + 1, y)

  const cells = [up, down, left, right]
  const adjacent_cells = []

  for (let cell of cells) {
    if (cell.x < 0) continue
    if (cell.y < 0) continue
    if (cell.x > width - 1) continue
    if (cell.y > height - 1) continue
    if (grid[cell.y][cell.x] === 1) continue

    adjacent_cells.push(cell)
  }

  return adjacent_cells
}

function get_shortest_path(grid, map) {
  let answer = ``
  let pos = [0, 0]

  while (true) {
    const x = pos[0]
    const y = pos[1]

    const distance = map[y][x]
    if (distance <= 0) return answer

    const adjacent_cells = get_adjacent_cells(grid, x, y)
    const next_cell = adjacent_cells.reduce((min_cell, cell) => {
      const cell_dist = map[cell.y][cell.x]
      const min_cell_dist = map[min_cell.y][min_cell.x]

      return cell_dist < min_cell_dist ? cell : min_cell
    })

    answer += next_cell.code
    pos = [next_cell.x, next_cell.y]
  }
}


class Edge {
  constructor(v0, v1) {
    this.v0 = v0
    this.v1 = v1
    this.v0 = Math.min(v0, v1)
    this.v1 = Math.max(v0, v1)
  }
}
function get_unique_edges(input) {
  const unique_edges = []
  input
    .map(e => new Edge(e[0], e[1]))
    .forEach(e => {
      if (!unique_edges.some(ue => e.v0 === ue.v0 && e.v1 === ue.v1)) {
        unique_edges.push(e)
      }
    })

  return unique_edges
}
