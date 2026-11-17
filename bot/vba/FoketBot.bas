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
'   어떤 종목의 E열(포지션)이 바뀌면 그 종목을 받는 회원에게만 즉시 신호를 보냅니다.
'     데일리 회원 = 코스피200 + D4에 적은 종목,  셀렉트 회원 = 본인이 고른 1종목
'   예) 골드 E열이 빈칸(0) → "매수"  :  "[GC 골드] 매수 진입 2650 (22:31)"
'       골드 E열이 "매수" → 빈칸(0)  :  "[GC 골드] 매수 청산  청산손익 +$1,000 (23:10)"
Option Explicit

Const BOT_URL As String = "https://foket.com/bot-api"
Const BOT_KEY As String = "봇에_/excel_보내면_나오는_BOT_KEY"
Const SHEET_NAME As String = "봇"
Const PUSH_SECONDS As Long = 10
Const FIRST_SELECT_ROW As Long = 6
Const LAST_SELECT_ROW As Long = 30      ' 종목을 더 넣어도 30행까지 읽음 (빈 줄은 건너뜀)

Dim nextRun As Date
Dim lastPos As Object      ' 종목코드 → 직전 포지션

Public Sub StartFoketBot()
    Set lastPos = Nothing
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

' 포지션 칸 값: "매수" 또는 "매도"만 포지션, 그 밖(빈칸, 0 등)은 모두 "없음"
Private Function PosOf(ws As Worksheet, r As Long) As String
    Dim v As String
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
    s = """" & JsonEsc(code) & """,""" & JsonEsc(Trim(ws.Cells(r, 4).Text)) & """"
    s = s & ",""" & JsonEsc(PosOf(ws, r)) & """"
    For c = 6 To 9      ' F~I
        s = s & ",""" & JsonEsc(Trim(ws.Cells(r, c).Text)) & """"
    Next c
    RowJson = "[" & s & ",""" & IIf(daily, "Y", "") & """]"
End Function

Public Sub PushTable()
    On Error Resume Next
    Dim ws As Worksheet, r As Long, code As String, rows As String, dailyCode As String, first As Boolean
    Set ws = ThisWorkbook.Worksheets(SHEET_NAME)
    If lastPos Is Nothing Then
        Set lastPos = CreateObject("Scripting.Dictionary")
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

    PostJson "/position", "{""key"":""" & BOT_KEY & """,""rows"":[" & rows & "]}"
    nextRun = Now + TimeSerial(0, 0, PUSH_SECONDS)
    Application.OnTime nextRun, "PushTable"
End Sub

' 포지션(E열)이 바뀌면 신호 (엑셀을 처음 켰을 때는 보내지 않음)
Private Sub CheckSignal(ws As Worksheet, r As Long, code As String, first As Boolean)
    Dim pos As String
    pos = PosOf(ws, r)
    If Not first And lastPos.Exists(code) Then
        If lastPos(code) <> pos Then SendFoketSignal code, SignalText(ws, r, code, lastPos(code), pos)
    End If
    lastPos(code) = pos
End Sub

Private Function SignalText(ws As Worksheet, r As Long, code As String, oldPos As String, newPos As String) As String
    Dim head As String, t As String
    head = "[" & code & " " & Trim(ws.Cells(r, 4).Text) & "] "
    t = " (" & Format(Now, "hh:nn") & ")"
    If newPos = "없음" Then
        SignalText = head & oldPos & " 청산  청산손익 " & ws.Cells(r, 9).Text & t
    ElseIf oldPos = "없음" Then
        SignalText = head & newPos & " 진입 " & ws.Cells(r, 6).Text & t
    Else
        SignalText = head & oldPos & " → " & newPos & " 전환 " & ws.Cells(r, 6).Text & t
    End If
End Function

Public Sub SendFoketSignal(ByVal code As String, ByVal text As String)
    PostJson "/signal", "{""key"":""" & BOT_KEY & """,""sym"":""" & JsonEsc(code) & """,""text"":""" & JsonEsc(text) & """}"
End Sub

Private Sub PostJson(ByVal path As String, ByVal body As String)
    On Error Resume Next
    Dim h As Object
    Set h = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    h.setTimeouts 3000, 3000, 5000, 5000
    h.Open "POST", BOT_URL & path, False
    h.setRequestHeader "Content-Type", "application/json; charset=utf-8"
    h.send body
End Sub

Private Function JsonEsc(ByVal s As String) As String
    s = Replace(s, "\", "\\")
    s = Replace(s, """", "\""")
    s = Replace(s, vbCr, "")
    s = Replace(s, vbLf, "\n")
    JsonEsc = s
End Function
