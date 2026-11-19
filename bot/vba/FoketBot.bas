Attribute VB_Name = "FoketBot"
' 포켓 로직 엑셀 → foket_center_bot 연결 (엑셀 2007 이상)
'
' [봇 시트] Sean님이 만든 표 그대로 씁니다 (시트 이름은 아래 SHEET_NAME)
'   D열 종목명, E열 포지션, F열 진입가, G열 현재 평가손익, H열 진입시간, I열 청산손익
'   3행  : 데일리 한국선물 (코스피200)
'   4행  : 데일리 해외선물. D4 칸에 오늘 고른 종목 이름을 적습니다 (예: 골드). 6~23행의 이름과 똑같이.
'   6~23행: 셀렉트 18종목
'   E열 포지션: 매수 또는 매도. 그 밖의 값(빈칸, 0 등)은 모두 포지션 없음
'   E~I 칸은 로직 시트의 셀을 가리키는 수식으로 채웁니다 (예: E6 칸에 =나스닥로직!$K$5)
'
' [동작]
'   StartFoketBot 을 한 번 실행하면 10초마다 표 전체를 봇에 보냅니다 (회원의 "현재 포지션" 조회용).
'   E열(포지션)은 2초마다 읽고, 바뀐 값이 STABLE_SECONDS(12초) 동안 그대로 유지될 때만 신호를 보냅니다.
'   (계산 중 4초 간격으로 빈칸 → 매수 → 빈칸 → 매도 처럼 깜빡이는 값은 신호로 보내지 않음)
'     데일리 회원 = 코스피200 + D4에 적은 종목,  셀렉트 회원 = 본인이 고른 1종목
'   예) 골드 E열이 빈칸(0) → "매수"  :  "[GC 골드] 매수 진입 2650 (22:31)"
'       골드 E열이 "매수" → 빈칸(0)  :  "[GC 골드] 매수 청산  청산손익 +$1,000 (23:10)"
Option Explicit

Const BOT_URL As String = "https://foket.com/bot-api"
Const BOT_KEY As String = "봇에_/excel_보내면_나오는_BOT_KEY"
Const SHEET_NAME As String = "봇"
Const PUSH_SECONDS As Long = 10        ' 표 전체를 봇에 보내는 간격
Const CHECK_SECONDS As Long = 2        ' 포지션(E열)을 읽는 간격
Const STABLE_SECONDS As Long = 12      ' 바뀐 포지션이 이만큼 그대로여야 신호 (깜빡임 무시)
Const KRW_PER_USD As Double = 1420     ' 손익(달러로 나옴)을 원화로 바꿀 때 쓰는 고정 환율 (Sean, 11-19)
Const VALUE_WAIT_SECONDS As Long = 30  ' 진입가·청산손익 칸이 #N/A 같은 오류면 값이 나올 때까지 더 기다리는 시간
Const FIRST_SELECT_ROW As Long = 6
Const LAST_SELECT_ROW As Long = 30      ' 종목을 더 넣어도 30행까지 읽음 (빈 줄은 건너뜀)

Dim nextRun As Date
Dim lastPos As Object      ' 종목코드 → 직전 포지션
Dim candPos As Object      ' 종목코드 → 바뀌는 중인 새 포지션 (아직 확정 전)
Dim candSince As Object    ' 종목코드 → 그 새 포지션이 처음 보인 시각
Dim lastPush As Date
Dim goodMethod As Long     ' 이 PC에서 되는 전송 방식 (처음 한 번 찾아서 기억)

Public Sub StartFoketBot()
    StopFoketBot
    Set lastPos = Nothing
    lastPush = 0
    PushTable
End Sub

Public Sub StopFoketBot()
    On Error Resume Next
    Application.OnTime nextRun, "PushTable", , False
End Sub

' 종목 이름 → 봇이 쓰는 코드. 새 종목을 넣으면 여기에 한 줄 추가
Private Function CodeOf(ByVal nm As String) As String
    Dim s As String
    s = Replace(Replace(UCase(nm), " ", ""), "&", "")
    Select Case True
        Case InStr(s, "코스피") > 0: CodeOf = "K200"
        Case InStr(s, "나스닥") > 0: CodeOf = "NQ"
        Case InStr(s, "유로") > 0: CodeOf = "6E"
        Case InStr(s, "골드") > 0: CodeOf = "GC"
        Case InStr(s, "에스앤피") > 0 Or InStr(s, "S P") > 0 Or InStr(s, "SP") > 0: CodeOf = "ES"
        Case InStr(s, "크루드") > 0: CodeOf = "CL"
        Case InStr(s, "천연가스") > 0: CodeOf = "NG"
        Case InStr(s, "H-SHARE") > 0 Or InStr(s, "HSHARE") > 0: CodeOf = "HHI"
        Case InStr(s, "실버") > 0: CodeOf = "SIL"
        Case InStr(s, "소이빈") > 0 Or InStr(s, "대두") > 0: CodeOf = "ZS"
        Case InStr(s, "옥수수") > 0: CodeOf = "ZC"
        Case InStr(s, "페소") > 0: CodeOf = "6M"
        Case InStr(s, "뉴질랜드") > 0: CodeOf = "6N"
        Case InStr(s, "니케이") > 0: CodeOf = "NKD"
        Case InStr(s, "엔") > 0: CodeOf = "6J"
        Case InStr(s, "호주") > 0: CodeOf = "6A"
        Case InStr(s, "파운드") > 0: CodeOf = "6B"
        Case InStr(s, "본드") > 0 Or InStr(s, "T본드") > 0: CodeOf = "UB"
        Case s = "밀": CodeOf = "ZW"
        Case Else: CodeOf = s
    End Select
End Function

' 칸 글자. #N/A 같은 오류값이면 빈칸으로
Private Function CellText(ws As Worksheet, r As Long, c As Long) As String
    If IsError(ws.Cells(r, c).Value) Then
        CellText = ""
    Else
        CellText = Trim(CStr(ws.Cells(r, c).Text))
    End If
End Function

' 손익 칸 글자 (엑셀 값은 달러). 원화(고정 환율, 1,000원 단위)와 달러(정수)를 함께. 예) -832.59 → -1,182,000원 (-$833)
Private Function MoneyText(ws As Worksheet, r As Long, c As Long, code As String) As String
    Dim v As Variant, w As Double, d As Double
    v = ws.Cells(r, c).Value
    If Not IsError(v) And Not IsEmpty(v) And IsNumeric(v) Then
        w = Int(CDbl(v) * KRW_PER_USD / 1000 + 0.5) * 1000
        d = Int(CDbl(v) + 0.5)
        MoneyText = Format(w, "#,##0") & "원 (" & IIf(d < 0, "-$", "$") & Format(Abs(d), "#,##0") & ")"
    Else
        MoneyText = CellText(ws, r, c)
    End If
End Function

' 포지션 칸 값: "매수" 또는 "매도"만 포지션, 그 밖(빈칸, 0 등)은 모두 "없음". 오류값(#N/A 등)은 "?" = 모름
Private Function PosOf(ws As Worksheet, r As Long) As String
    Dim v As String
    If IsError(ws.Cells(r, 5).Value) Then PosOf = "?": Exit Function
    v = Trim(CStr(ws.Cells(r, 5).Text))
    If InStr(v, "매수") > 0 Then
        PosOf = "매수"
    ElseIf InStr(v, "매도") > 0 Then
        PosOf = "매도"
    Else
        PosOf = "없음"
    End If
End Function

Private Function RowJson(ws As Worksheet, r As Long, code As String, daily As Boolean) As String
    Dim c As Long, s As String
    s = """" & JsonEsc(code) & """,""" & JsonEsc(CellText(ws, r, 4)) & """"
    s = s & ",""" & JsonEsc(Replace(PosOf(ws, r), "?", "")) & """"
    For c = 6 To 9      ' F~I (손익 G·I는 원화와 달러 함께)
        If c = 7 Or c = 9 Then
            s = s & ",""" & JsonEsc(MoneyText(ws, r, c, code)) & """"
        Else
            s = s & ",""" & JsonEsc(CellText(ws, r, c)) & """"
        End If
    Next c
    RowJson = "[" & s & ",""" & IIf(daily, "Y", "") & """]"
End Function

' 2초마다 실행: 포지션 확인, 10초마다 표 전체 전송
Public Sub PushTable()
    On Error Resume Next
    Dim ws As Worksheet, r As Long, code As String, rows As String, dailyCode As String, first As Boolean
    Set ws = ThisWorkbook.Worksheets(SHEET_NAME)
    If lastPos Is Nothing Then
        Set lastPos = CreateObject("Scripting.Dictionary")
        Set candPos = CreateObject("Scripting.Dictionary")
        Set candSince = CreateObject("Scripting.Dictionary")
        first = True
    End If
    dailyCode = CodeOf(Trim(ws.Cells(4, 4).Text))      ' D4 = 오늘 데일리 해외 종목

    ' 3행 코스피200 (데일리 고정)
    code = CodeOf(Trim(ws.Cells(3, 4).Text))
    rows = RowJson(ws, 3, code, True)
    CheckSignal ws, 3, code, first

    ' 6행~ 셀렉트 종목
    For r = FIRST_SELECT_ROW To LAST_SELECT_ROW
        If Trim(ws.Cells(r, 4).Text) <> "" Then
            code = CodeOf(Trim(ws.Cells(r, 4).Text))
            rows = rows & "," & RowJson(ws, r, code, (code = dailyCode))
            CheckSignal ws, r, code, first
        End If
    Next r

    If (Now - lastPush) * 86400 >= PUSH_SECONDS - 1 Then
        PostJson "/position", "{""key"":""" & BOT_KEY & """,""rows"":[" & rows & "]}"
        lastPush = Now
    End If
    nextRun = Now + TimeSerial(0, 0, CHECK_SECONDS)
    Application.OnTime nextRun, "PushTable"
End Sub

' 포지션(E열)이 바뀌고 STABLE_SECONDS 동안 그대로면 신호 (엑셀을 처음 켰을 때는 보내지 않음)
Private Sub CheckSignal(ws As Worksheet, r As Long, code As String, first As Boolean)
    Dim pos As String
    pos = PosOf(ws, r)
    If pos = "?" Then Exit Sub              ' 포지션 칸이 오류값: 판단 보류
    If first Or Not lastPos.Exists(code) Then
        lastPos(code) = pos
        candPos(code) = pos
        Exit Sub
    End If
    If pos = lastPos(code) Then             ' 원래 값으로 돌아옴 = 깜빡임, 무시
        candPos(code) = pos
        Exit Sub
    End If
    If candPos(code) <> pos Then            ' 새 값이 처음 보임: 시각만 기록
        candPos(code) = pos
        candSince(code) = Now
        Exit Sub
    End If
    If (Now - candSince(code)) * 86400 >= STABLE_SECONDS Then
        ' 신호에 넣을 값(진입가 F 또는 청산손익 I)이 아직 오류값이면 조금 더 기다림
        If IsError(ws.Cells(r, IIf(pos = "없음", 9, 6)).Value) And _
           (Now - candSince(code)) * 86400 < STABLE_SECONDS + VALUE_WAIT_SECONDS Then Exit Sub
        SendFoketSignal code, SignalText(ws, r, code, lastPos(code), pos)
        lastPos(code) = pos
    End If
End Sub

Private Function SignalText(ws As Worksheet, r As Long, code As String, oldPos As String, newPos As String) As String
    Dim head As String, t As String
    Dim px As String, pl As String
    head = "[" & code & " " & CellText(ws, r, 4) & "] "
    t = " (" & Format(Now, "hh:nn") & ")"
    px = CellText(ws, r, 6): If px = "" Then px = "-"
    pl = MoneyText(ws, r, 9, code): If pl = "" Then pl = "-"
    If newPos = "없음" Then
        SignalText = head & oldPos & " 청산  청산손익 " & pl & t
    ElseIf oldPos = "없음" Then
        SignalText = head & newPos & " 진입 " & px & t
    Else
        SignalText = head & oldPos & " → " & newPos & " 전환 " & px & t
    End If
End Function

' 연결 시험: Alt+F8 → TestFoketBot. 접속 방법 3가지를 차례로 시험해 결과를 창으로 보여 줌
Public Sub TestFoketBot()
    Dim ws As Worksheet, body As String, r As Long, code As String, rows As String, i As Long, msg As String, res As String
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(SHEET_NAME)
    If ws Is Nothing Then
        MsgBox "'" & SHEET_NAME & "' 시트를 찾지 못했습니다. 시트 이름을 확인해 주세요.", vbExclamation, "포켓 봇 연결 시험"
        Exit Sub
    End If
    On Error GoTo 0
    code = CodeOf(Trim(ws.Cells(3, 4).Text))
    rows = RowJson(ws, 3, code, True)
    For r = FIRST_SELECT_ROW To LAST_SELECT_ROW
        If Trim(ws.Cells(r, 4).Text) <> "" Then
            code = CodeOf(Trim(ws.Cells(r, 4).Text))
            rows = rows & "," & RowJson(ws, r, code, (code = CodeOf(Trim(ws.Cells(4, 4).Text))))
        End If
    Next r
    body = "{""key"":""" & BOT_KEY & """,""rows"":[" & rows & "]}"
    For i = 1 To 3
        res = TryPost(i, BOT_URL & "/position", body)
        msg = msg & MethodName(i) & ": " & res & vbCrLf
    Next i
    MsgBox msg & vbCrLf & "200 + ok true = 성공 / 403 = BOT_KEY 틀림 / 오류 = 그 방법은 이 PC에서 안 됨", _
           vbInformation, "포켓 봇 연결 시험"
End Sub

Private Function MethodName(ByVal i As Long) As String
    MethodName = Choose(i, "WinHttp", "MSXML XMLHTTP", "MSXML ServerXMLHTTP")
End Function

' 한글이 깨지지 않도록 UTF-8 바이트로 바꿔서 보냄
Private Function Utf8Bytes(ByVal s As String) As Variant
    Dim st As Object
    Set st = CreateObject("ADODB.Stream")
    st.Type = 2: st.Charset = "utf-8": st.Open
    st.WriteText s
    st.Position = 0: st.Type = 1: st.Position = 3     ' 앞의 BOM 3바이트 건너뜀
    Utf8Bytes = st.Read
    st.Close
End Function

' i번째 방법으로 보내고 "응답코드 내용" 또는 "오류 …" 를 돌려줌
Private Function TryPost(ByVal i As Long, ByVal url As String, ByVal body As String) As String
    Dim h As Object
    On Error GoTo Fail
    Select Case i
        Case 1
            Set h = CreateObject("WinHttp.WinHttpRequest.5.1")
            On Error Resume Next
            h.Option(9) = 2048 Or 512          ' TLS 1.2 / 1.1 사용
            On Error GoTo Fail
            h.SetTimeouts 5000, 5000, 10000, 10000
        Case 2
            Set h = CreateObject("MSXML2.XMLHTTP.6.0")
        Case 3
            Set h = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    End Select
    h.Open "POST", url, False
    h.setRequestHeader "Content-Type", "application/json; charset=utf-8"
    h.send Utf8Bytes(body)
    TryPost = h.Status & " " & Left(h.responseText, 80)
    Exit Function
Fail:
    TryPost = "오류 " & Err.Number & " " & Err.Description
End Function

Public Sub SendFoketSignal(ByVal code As String, ByVal text As String)
    PostJson "/signal", "{""key"":""" & BOT_KEY & """,""sym"":""" & JsonEsc(code) & """,""text"":""" & JsonEsc(text) & """}"
End Sub


Private Sub PostJson(ByVal path As String, ByVal body As String)
    Dim i As Long, res As String
    On Error Resume Next
    If goodMethod > 0 Then
        res = TryPost(goodMethod, BOT_URL & path, body)
        If Left(res, 2) <> "오류" Then Exit Sub
    End If
    For i = 1 To 3
        res = TryPost(i, BOT_URL & path, body)
        If Left(res, 2) <> "오류" Then goodMethod = i: Exit Sub
    Next i
End Sub

Private Function JsonEsc(ByVal s As String) As String
    s = Replace(s, "\", "\\")
    s = Replace(s, """", "\""")
    s = Replace(s, vbCr, "")
    s = Replace(s, vbLf, "\n")
    JsonEsc = s
End Function
