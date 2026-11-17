Attribute VB_Name = "FoketBot"
' 포켓 로직 엑셀 → 포켓 봇 연결 (엑셀 2007 이상)
'
' [봇 시트 만들기] 시트 이름 "봇", 1행부터 한 줄에 한 종목 (최대 200종목)
'   A열 종목코드 (NQ, ES, GC, K200 ...)   ← 봇은 이 코드로 종목을 알아봅니다
'   B열 종목명   C열 포지션 (매수/매도/없음)   D열 진입가   E열 현재가   F열 평가손익   G열 진입시간
'   H열 Y = 오늘 데일리 시그널 종목 (해외 1 + 한국 1, 매일 바뀌면 Y 위치만 옮김)
'   각 칸은 로직 시트의 셀을 가리키는 수식으로 채우면 됩니다 (예: C1 칸에 =로직NQ!$K$5)
'
' [동작]
'   StartFoketBot 을 한 번 실행하면 10초마다 표 전체를 봇에 보냅니다 (회원의 "현재 포지션" 조회용).
'   어떤 줄의 C열(포지션)이 바뀌면 그 종목을 받는 회원에게 즉시 신호를 보냅니다.
'   예) NQ 줄 C열이 "없음" → "매수" 로 바뀌면  "[NQ 미니나스닥] 매수 진입 21000 (22:31)"
Option Explicit

Const BOT_URL As String = "https://foket.com/bot-api"
Const BOT_KEY As String = "봇에_/excel_보내면_나오는_BOT_KEY"
Const SHEET_NAME As String = "봇"
Const PUSH_SECONDS As Long = 10

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

Public Sub PushTable()
    On Error Resume Next
    Dim ws As Worksheet, r As Long, c As Long, code As String, pos As String, rows As String, cells As String
    Dim first As Boolean
    Set ws = ThisWorkbook.Worksheets(SHEET_NAME)
    If lastPos Is Nothing Then
        Set lastPos = CreateObject("Scripting.Dictionary")
        first = True
    End If
    For r = 1 To 200
        code = Trim(CStr(ws.Cells(r, 1).Text))
        If code = "" Then Exit For
        cells = ""
        For c = 1 To 8
            cells = cells & IIf(c > 1, ",", "") & """" & JsonEsc(CStr(ws.Cells(r, c).Text)) & """"
        Next c
        rows = rows & IIf(rows = "", "", ",") & "[" & cells & "]"

        ' 포지션이 바뀌면 신호 (엑셀을 처음 켰을 때는 보내지 않음)
        pos = Trim(CStr(ws.Cells(r, 3).Text))
        If Not first And lastPos.Exists(code) Then
            If lastPos(code) <> pos Then
                SendFoketSignal code, SignalText(ws, r, lastPos(code), pos)
            End If
        End If
        lastPos(code) = pos
    Next r
    PostJson "/position", "{""key"":""" & BOT_KEY & """,""rows"":[" & rows & "]}"
    nextRun = Now + TimeSerial(0, 0, PUSH_SECONDS)
    Application.OnTime nextRun, "PushTable"
End Sub

Private Function SignalText(ws As Worksheet, r As Long, oldPos As String, newPos As String) As String
    Dim head As String
    head = "[" & ws.Cells(r, 1).Text & " " & ws.Cells(r, 2).Text & "] "
    If newPos = "" Or newPos = "없음" Or newPos = "0" Then
        SignalText = head & oldPos & " 청산 " & ws.Cells(r, 5).Text & "  손익 " & ws.Cells(r, 6).Text & _
                     " (" & Format(Now, "hh:nn") & ")"
    Else
        SignalText = head & newPos & " 진입 " & ws.Cells(r, 4).Text & " (" & Format(Now, "hh:nn") & ")"
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
